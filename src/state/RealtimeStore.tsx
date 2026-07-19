import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import {
  type ChatServerRealtimeMessage,
  createRealtimeMessage,
  parseServerRealtimeMessage,
  realtimeProtocolVersion,
} from '../domain/realtimeProtocol';
import {
  getPendingWorkoutPushEvents,
  getSyncEligibleSessions,
} from '../domain/sync';
import { getRealtimeWebSocketUrl } from '../services/accountApi';
import { showWorkoutEventNotification } from '../services/notifications';
import {
  loadObserverCache,
  mergeObserverSessions,
  saveObserverCache,
} from '../services/observerStorage';
import {
  loadOrCreateOwnerSyncMetadata,
  type OwnerSyncMetadata,
  saveOwnerSyncMetadata,
} from '../services/ownerSyncStorage';
import {
  createOwnerSnapshotMessages,
  getRealtimePresenceState,
  initialRealtimeDiagnosticsState,
  initializeOwnerSyncMetadata,
  markNotificationEventHandled,
  reduceRealtimeDiagnostics,
  resolveRealtimeDisconnectReason,
  shouldForceRefreshRealtimeToken,
  shouldSendOwnerSnapshot,
  shouldReconnectRealtimeSocket,
  type RealtimeDisconnectDetails,
} from '../services/realtime';
import type {
  ChatMessageType,
  ObserverCache,
  RealtimeConnectionState,
  WorkoutSession,
} from '../types';
import { useAccountStore } from './AccountStore';
import { useAppStore } from './AppStore';

interface RealtimeStoreValue {
  connectionState: RealtimeConnectionState;
  chatReady: boolean;
  ownerConnected: boolean;
  observerConnected: boolean;
  observerSessions: WorkoutSession[];
  lastSyncedAt: string | null;
  lastDisconnect: RealtimeDisconnectDetails | null;
  reconnectCount: number;
  chatEvent: { sequence: number; event: ChatServerRealtimeMessage } | null;
  chatError: { sequence: number; messageId: string | null; error: string } | null;
  sendChatMessage: (message: {
    messageId: string;
    messageType: ChatMessageType;
    content: string;
    replyToMessageId: string | null;
    clientCreatedAt: number;
  }) => boolean;
}

interface SnapshotAssembly {
  chunkCount: number;
  chunks: Map<number, WorkoutSession[]>;
  timeout: ReturnType<typeof setTimeout>;
}

const RealtimeStoreContext = createContext<RealtimeStoreValue | null>(null);

const initialObserverCache: ObserverCache = {
  version: 1,
  sessions: [],
  lastSyncedAt: null,
  handledWorkoutEventIds: [],
};

const realtimeAuthenticationTimeoutMs = 8_000;
const realtimeConnectionTimeoutMs = 15_000;

function isSocketOpen(socket: WebSocket | null): socket is WebSocket {
  return socket?.readyState === WebSocket.OPEN;
}

// [Function] Bridges local workout state with protocol v2. [Warning] Network failure must never block local training or overwrite newer cached sessions.
export function RealtimeStoreProvider({ children }: { children: ReactNode }) {
  const { session, getAccessToken, logout } = useAccountStore();
  const { data, hydrated: appHydrated } = useAppStore();
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('offline');
  const [chatReady, setChatReady] = useState(false);
  const [ownerConnected, setOwnerConnected] = useState(false);
  const [observerConnected, setObserverConnected] = useState(false);
  const [observerCache, setObserverCache] = useState<ObserverCache>(initialObserverCache);
  const [observerCacheHydrated, setObserverCacheHydrated] = useState(false);
  const [ownerMetadata, setOwnerMetadata] = useState<OwnerSyncMetadata | null>(null);
  const [chatEvent, setChatEvent] = useState<RealtimeStoreValue['chatEvent']>(null);
  const [chatError, setChatError] = useState<RealtimeStoreValue['chatError']>(null);
  const [realtimeDiagnostics, dispatchRealtimeDiagnostics] = useReducer(
    reduceRealtimeDiagnostics,
    initialRealtimeDiagnosticsState,
  );
  const socketRef = useRef<WebSocket | null>(null);
  const authenticatedSocketRef = useRef<WebSocket | null>(null);
  const sessionsRef = useRef(data.sessions);
  const ownerMetadataRef = useRef<OwnerSyncMetadata | null>(null);
  const ownerMetadataWriteRef = useRef<Promise<void>>(Promise.resolve());
  const observerCacheRef = useRef(observerCache);
  const observerCacheWriteRef = useRef<Promise<void>>(Promise.resolve());
  const sentSessionVersionsRef = useRef(new Map<string, string>());
  const sentWorkoutEventIdsRef = useRef(new Map<string, number>());
  const observerOnlineRef = useRef(false);
  const snapshotAssembliesRef = useRef(new Map<string, SnapshotAssembly>());
  const chatEventSequenceRef = useRef(0);
  const diagnosticsRoleRef = useRef(session?.role ?? null);
  const ownerMetadataReady = ownerMetadata !== null;

  useEffect(() => {
    const currentRole = session?.role ?? null;
    if (diagnosticsRoleRef.current !== currentRole) {
      diagnosticsRoleRef.current = currentRole;
      dispatchRealtimeDiagnostics({ type: 'session_reset' });
    }
  }, [session?.role]);

  useEffect(() => {
    sessionsRef.current = data.sessions;
  }, [data.sessions]);

  useEffect(() => {
    ownerMetadataRef.current = ownerMetadata;
  }, [ownerMetadata]);

  useEffect(() => {
    observerCacheRef.current = observerCache;
  }, [observerCache]);

  const replaceOwnerMetadata = useCallback((metadata: OwnerSyncMetadata): Promise<void> => {
    ownerMetadataRef.current = metadata;
    setOwnerMetadata(metadata);
    const write = ownerMetadataWriteRef.current
      .catch(() => undefined)
      .then(() => saveOwnerSyncMetadata(metadata));
    ownerMetadataWriteRef.current = write.catch(() => undefined);
    return write;
  }, []);

  const replaceObserverCache = useCallback((cache: ObserverCache): Promise<void> => {
    observerCacheRef.current = cache;
    setObserverCache(cache);
    const write = observerCacheWriteRef.current
      .catch(() => undefined)
      .then(() => saveObserverCache(cache));
    observerCacheWriteRef.current = write.catch(() => undefined);
    return write;
  }, []);

  useEffect(() => {
    if (!appHydrated || session?.role !== 'owner') {
      setOwnerMetadata(null);
      ownerMetadataRef.current = null;
      return;
    }

    let cancelled = false;
    const initializationStartedAt = new Date().toISOString();
    const activeSessionIds = sessionsRef.current
      .filter((workoutSession) => workoutSession.status === 'in_progress')
      .map((workoutSession) => workoutSession.id);
    void loadOrCreateOwnerSyncMetadata(activeSessionIds)
      .then((metadata) => {
        if (cancelled) {
          return;
        }
        const currentlyActiveSessionIds = sessionsRef.current
          .filter((workoutSession) => workoutSession.status === 'in_progress')
          .map((workoutSession) => workoutSession.id);
        return replaceOwnerMetadata(initializeOwnerSyncMetadata(
          metadata,
          initializationStartedAt,
          [...activeSessionIds, ...currentlyActiveSessionIds],
        ));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        return replaceOwnerMetadata({
          version: 1,
          syncStartedAt: initializationStartedAt,
          includedSessionIds: activeSessionIds,
          handledNotificationEventIds: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [appHydrated, replaceOwnerMetadata, session?.role]);

  useEffect(() => {
    if (session?.role !== 'observer') {
      setObserverCacheHydrated(false);
      return;
    }

    let cancelled = false;
    setObserverCacheHydrated(false);
    void loadObserverCache()
      .then((cache) => {
        if (!cancelled) {
          observerCacheRef.current = cache;
          setObserverCache(cache);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setObserverCacheHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.role]);

  const mergeObserverCache = useCallback((incomingSessions: WorkoutSession[]) => {
    const nextCache: ObserverCache = {
      ...observerCacheRef.current,
      sessions: mergeObserverSessions(observerCacheRef.current.sessions, incomingSessions),
      lastSyncedAt: new Date().toISOString(),
    };
    void replaceObserverCache(nextCache).catch(() => undefined);
  }, [replaceObserverCache]);

  const sendOwnerSnapshot = useCallback(() => {
    const socket = authenticatedSocketRef.current;
    const metadata = ownerMetadataRef.current;
    if (!isSocketOpen(socket) || !metadata) {
      return;
    }

    const sessions = getSyncEligibleSessions(sessionsRef.current, metadata);
    try {
      for (const message of createOwnerSnapshotMessages(sessions)) {
        if (!isSocketOpen(socket) || authenticatedSocketRef.current !== socket) {
          return;
        }
        socket.send(message);
      }
      sentSessionVersionsRef.current = new Map(
        sessions.map((workoutSession) => [workoutSession.id, workoutSession.updatedAt]),
      );
    } catch {
      return;
    }
  }, []);

  const sendPendingWorkoutEvents = useCallback(() => {
    const socket = authenticatedSocketRef.current;
    const metadata = ownerMetadataRef.current;
    if (!isSocketOpen(socket) || !metadata || !observerOnlineRef.current) {
      return;
    }

    const now = Date.now();
    for (const { event, expired } of getPendingWorkoutPushEvents(sessionsRef.current, metadata)) {
      const lastSentAt = sentWorkoutEventIdsRef.current.get(event.id);
      if (expired || (lastSentAt !== undefined && now - lastSentAt < 10_000)) {
        continue;
      }
      socket.send(JSON.stringify(createRealtimeMessage({
        type: 'workout_event',
        eventId: event.id,
        sessionId: event.data.sessionId,
        eventType: event.type,
      })));
      sentWorkoutEventIdsRef.current.set(event.id, now);
    }
  }, []);

  const receiveSnapshotChunk = useCallback((message: {
    snapshotId: string;
    chunkIndex: number;
    chunkCount: number;
    sessions: WorkoutSession[];
  }) => {
    if (
      !message.snapshotId ||
      message.chunkCount <= 0 ||
      message.chunkIndex < 0 ||
      message.chunkIndex >= message.chunkCount
    ) {
      return;
    }

    let assembly = snapshotAssembliesRef.current.get(message.snapshotId);
    if (!assembly) {
      const timeout = setTimeout(() => {
        snapshotAssembliesRef.current.delete(message.snapshotId);
      }, 15_000);
      assembly = { chunkCount: message.chunkCount, chunks: new Map(), timeout };
      snapshotAssembliesRef.current.set(message.snapshotId, assembly);
    }
    if (assembly.chunkCount !== message.chunkCount) {
      clearTimeout(assembly.timeout);
      snapshotAssembliesRef.current.delete(message.snapshotId);
      return;
    }
    assembly.chunks.set(message.chunkIndex, message.sessions);
    if (assembly.chunks.size !== assembly.chunkCount) {
      return;
    }

    clearTimeout(assembly.timeout);
    snapshotAssembliesRef.current.delete(message.snapshotId);
    const completeSessions = Array.from({ length: assembly.chunkCount }, (_, chunkIndex) =>
      assembly!.chunks.get(chunkIndex) ?? []).flat();
    mergeObserverCache(completeSessions);
  }, [mergeObserverCache]);

  const sendChatMessage = useCallback((message: {
    messageId: string;
    messageType: ChatMessageType;
    content: string;
    replyToMessageId: string | null;
    clientCreatedAt: number;
  }): boolean => {
    const socket = authenticatedSocketRef.current;
    if (!isSocketOpen(socket)) {
      return false;
    }
    socket.send(JSON.stringify(createRealtimeMessage({
      type: 'chat_message',
      ...message,
    })));
    return true;
  }, []);

  useEffect(() => {
    const role = session?.role;
    const ready = role === 'owner'
      ? appHydrated && ownerMetadataReady
      : role === 'observer' && observerCacheHydrated;
    if (!role || !ready) {
      setConnectionState('offline');
      setOwnerConnected(false);
      setObserverConnected(false);
      return;
    }

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let authenticationTimer: ReturnType<typeof setTimeout> | null = null;
    let connectionTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelayMs = 1_000;
    let forceRefreshOnNextConnect = false;
    let hasForcedTokenRefreshSinceAuthentication = false;

    const recordDisconnect = (code: number | null, reason: string) => {
      dispatchRealtimeDiagnostics({
        type: 'disconnect',
        code,
        reason,
        occurredAt: Date.now(),
      });
    };

    const scheduleReconnect = (forceRefreshAccessToken = false) => {
      if (cancelled) {
        return;
      }
      forceRefreshOnNextConnect ||= forceRefreshAccessToken;
      if (reconnectTimer) {
        return;
      }
      dispatchRealtimeDiagnostics({ type: 'reconnect_scheduled' });
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        const forceRefresh = forceRefreshOnNextConnect;
        forceRefreshOnNextConnect = false;
        void connect(forceRefresh);
      }, reconnectDelayMs);
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30_000);
    };

    const connect = async (forceRefreshAccessToken = false) => {
      setConnectionState('connecting');
      const accessToken = await getAccessToken(forceRefreshAccessToken);
      if (cancelled) {
        return;
      }
      if (!accessToken) {
        recordDisconnect(
          null,
          forceRefreshAccessToken ? 'token_refresh_unavailable' : 'access_token_unavailable',
        );
        setConnectionState('offline');
        scheduleReconnect(forceRefreshAccessToken);
        return;
      }

      let socket: WebSocket;
      let localCloseReason: string | null = null;
      try {
        socket = new WebSocket(getRealtimeWebSocketUrl());
      } catch {
        recordDisconnect(null, 'websocket_create_failed');
        setConnectionState('offline');
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;
      connectionTimer = setTimeout(() => {
        if (socketRef.current !== socket || socket.readyState !== WebSocket.CONNECTING) {
          return;
        }
        connectionTimer = null;
        socketRef.current = null;
        recordDisconnect(null, 'connection_timeout');
        setConnectionState('offline');
        scheduleReconnect();
        try {
          socket.close();
        } catch {}
      }, realtimeConnectionTimeoutMs);

      socket.onopen = () => {
        if (cancelled || socketRef.current !== socket) {
          socket.close();
          return;
        }
        if (connectionTimer) {
          clearTimeout(connectionTimer);
          connectionTimer = null;
        }
        socket.send(JSON.stringify({
          protocolVersion: realtimeProtocolVersion,
          type: 'authenticate',
          accessToken,
        }));
        authenticationTimer = setTimeout(() => {
          if (socketRef.current === socket && authenticatedSocketRef.current !== socket) {
            localCloseReason = 'authentication_timeout';
            socket.close(4_002, 'authentication_timeout');
          }
        }, realtimeAuthenticationTimeoutMs);
        heartbeatTimer = setInterval(() => {
          if (isSocketOpen(socket)) {
            socket.send(JSON.stringify(createRealtimeMessage({ type: 'heartbeat' })));
            if (role === 'owner') {
              sendPendingWorkoutEvents();
            }
          }
        }, 25_000);
      };

      socket.onmessage = (event) => {
        if (socketRef.current !== socket || typeof event.data !== 'string') {
          return;
        }
        const message = parseServerRealtimeMessage(event.data);
        if (!message) {
          return;
        }

        if (
          message.type === 'chat_message' ||
          message.type === 'chat_saved' ||
          message.type === 'chat_delivered' ||
          message.type === 'chat_read' ||
          message.type === 'chat_recalled'
        ) {
          chatEventSequenceRef.current += 1;
          setChatEvent({ sequence: chatEventSequenceRef.current, event: message });
          return;
        }

        if (message.type === 'error') {
          chatEventSequenceRef.current += 1;
          setChatError({
            sequence: chatEventSequenceRef.current,
            messageId: message.messageId ?? null,
            error: message.error,
          });
          return;
        }

        if (message.type === 'authenticated') {
          if (message.role !== role) {
            localCloseReason = 'role_mismatch';
            socket.close(4_004, 'role_mismatch');
            void logout().catch(() => undefined);
            return;
          }
          if (authenticationTimer) {
            clearTimeout(authenticationTimer);
            authenticationTimer = null;
          }
          reconnectDelayMs = 1_000;
          hasForcedTokenRefreshSinceAuthentication = false;
          authenticatedSocketRef.current = socket;
          setChatReady(true);
          setConnectionState('online');
          sentWorkoutEventIdsRef.current.clear();
          if (role === 'owner') {
            sendOwnerSnapshot();
            sendPendingWorkoutEvents();
          }
          return;
        }

        if (message.type === 'presence') {
          const observerWasOnline = observerOnlineRef.current;
          const presenceState = getRealtimePresenceState(
            role,
            message.ownerOnline,
            message.observerOnline,
          );
          if (role === 'observer') {
            setOwnerConnected(presenceState.peerConnected);
          }
          setObserverConnected(presenceState.observerConnected);
          observerOnlineRef.current = message.observerOnline;
          if (!message.observerOnline) {
            sentWorkoutEventIdsRef.current.clear();
          }
          if (
            role === 'owner' &&
            shouldSendOwnerSnapshot(
              observerWasOnline,
              message.observerOnline,
              message.requestSnapshot === true,
            )
          ) {
            sendOwnerSnapshot();
          }
          if (role === 'owner' && message.observerOnline) {
            sendPendingWorkoutEvents();
          }
          return;
        }

        if (role === 'observer' && message.type === 'snapshot') {
          receiveSnapshotChunk(message);
          return;
        }

        if (role === 'observer' && message.type === 'session_upsert') {
          mergeObserverCache([message.session]);
          return;
        }

        if (role === 'observer' && message.type === 'workout_event') {
          const handledEventIds = observerCacheRef.current.handledWorkoutEventIds;
          if (!handledEventIds.includes(message.eventId)) {
            const nextCache = {
              ...observerCacheRef.current,
              handledWorkoutEventIds: [...handledEventIds, message.eventId].slice(-200),
            };
            void replaceObserverCache(nextCache).catch(() => undefined);
            void showWorkoutEventNotification(message.eventType, message.sessionId).catch(() => undefined);
          }
          if (isSocketOpen(socket)) {
            socket.send(JSON.stringify(createRealtimeMessage({
              type: 'event_ack',
              eventId: message.eventId,
            })));
          }
          return;
        }

        if (role === 'owner' && message.type === 'event_ack') {
          sentWorkoutEventIdsRef.current.delete(message.eventId);
          const metadata = ownerMetadataRef.current;
          if (metadata) {
            void replaceOwnerMetadata(markNotificationEventHandled(metadata, message.eventId))
              .catch(() => undefined);
          }
        }
      };

      socket.onerror = () => {
        if (socketRef.current === socket) {
          localCloseReason ??= 'websocket_error';
          socket.close();
        }
      };
      socket.onclose = (event) => {
        if (socketRef.current !== socket) {
          return;
        }
        if (connectionTimer) {
          clearTimeout(connectionTimer);
          connectionTimer = null;
        }
        if (authenticationTimer) {
          clearTimeout(authenticationTimer);
          authenticationTimer = null;
        }
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        recordDisconnect(
          typeof event.code === 'number' ? event.code : null,
          resolveRealtimeDisconnectReason(event.reason, localCloseReason),
        );
        socketRef.current = null;
        authenticatedSocketRef.current = null;
        setChatReady(false);
        observerOnlineRef.current = false;
        setConnectionState('offline');
        setOwnerConnected(false);
        setObserverConnected(false);
        if (shouldReconnectRealtimeSocket(event.code)) {
          const shouldForceRefresh =
            shouldForceRefreshRealtimeToken(event.code) &&
            !hasForcedTokenRefreshSinceAuthentication;
          hasForcedTokenRefreshSinceAuthentication ||= shouldForceRefresh;
          scheduleReconnect(shouldForceRefresh);
        }
      };
    };

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      if (authenticationTimer) {
        clearTimeout(authenticationTimer);
      }
      if (connectionTimer) {
        clearTimeout(connectionTimer);
      }
      const socket = socketRef.current;
      socketRef.current = null;
      authenticatedSocketRef.current = null;
      setChatReady(false);
      observerOnlineRef.current = false;
      setOwnerConnected(false);
      socket?.close();
    };
  }, [
    appHydrated,
    getAccessToken,
    logout,
    mergeObserverCache,
    observerCacheHydrated,
    ownerMetadataReady,
    receiveSnapshotChunk,
    replaceObserverCache,
    replaceOwnerMetadata,
    sendOwnerSnapshot,
    sendPendingWorkoutEvents,
    session?.role,
  ]);

  useEffect(() => {
    const metadata = ownerMetadataRef.current;
    if (session?.role !== 'owner' || !ownerMetadataReady || !metadata) {
      return;
    }

    const socket = authenticatedSocketRef.current;
    if (!isSocketOpen(socket)) {
      return;
    }

    for (const workoutSession of getSyncEligibleSessions(data.sessions, metadata)) {
      if (sentSessionVersionsRef.current.get(workoutSession.id) === workoutSession.updatedAt) {
        continue;
      }
      socket.send(JSON.stringify(createRealtimeMessage({
        type: 'session_upsert',
        session: workoutSession,
      })));
      sentSessionVersionsRef.current.set(workoutSession.id, workoutSession.updatedAt);
    }
    sendPendingWorkoutEvents();
  }, [data.sessions, ownerMetadataReady, sendPendingWorkoutEvents, session?.role]);

  useEffect(() => () => {
    for (const assembly of snapshotAssembliesRef.current.values()) {
      clearTimeout(assembly.timeout);
    }
    snapshotAssembliesRef.current.clear();
  }, []);

  const value = useMemo<RealtimeStoreValue>(
    () => ({
      connectionState,
      chatReady,
      ownerConnected,
      observerConnected,
      observerSessions: observerCache.sessions,
      lastSyncedAt: observerCache.lastSyncedAt,
      lastDisconnect: realtimeDiagnostics.lastDisconnect,
      reconnectCount: realtimeDiagnostics.reconnectCount,
      chatEvent,
      chatError,
      sendChatMessage,
    }),
    [
      chatError,
      chatEvent,
      chatReady,
      connectionState,
      observerCache,
      observerConnected,
      ownerConnected,
      realtimeDiagnostics,
      sendChatMessage,
    ],
  );

  return <RealtimeStoreContext.Provider value={value}>{children}</RealtimeStoreContext.Provider>;
}

export function useRealtimeStore(): RealtimeStoreValue {
  const context = useContext(RealtimeStoreContext);
  if (!context) {
    throw new Error('useRealtimeStore must be used within RealtimeStoreProvider.');
  }
  return context;
}
