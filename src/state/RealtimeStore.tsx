import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  initializeOwnerSyncMetadata,
  markNotificationEventHandled,
  shouldReconnectRealtimeSocket,
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
  observerConnected: boolean;
  observerSessions: WorkoutSession[];
  lastSyncedAt: string | null;
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

function isSocketOpen(socket: WebSocket | null): socket is WebSocket {
  return socket?.readyState === WebSocket.OPEN;
}

// [Function] Bridges local workout state with protocol v2. [Warning] Network failure must never block local training or overwrite newer cached sessions.
export function RealtimeStoreProvider({ children }: { children: ReactNode }) {
  const { session, getAccessToken } = useAccountStore();
  const { data, hydrated: appHydrated } = useAppStore();
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('offline');
  const [chatReady, setChatReady] = useState(false);
  const [observerConnected, setObserverConnected] = useState(false);
  const [observerCache, setObserverCache] = useState<ObserverCache>(initialObserverCache);
  const [observerCacheHydrated, setObserverCacheHydrated] = useState(false);
  const [ownerMetadata, setOwnerMetadata] = useState<OwnerSyncMetadata | null>(null);
  const [chatEvent, setChatEvent] = useState<RealtimeStoreValue['chatEvent']>(null);
  const [chatError, setChatError] = useState<RealtimeStoreValue['chatError']>(null);
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
      ? appHydrated && ownerMetadata !== null
      : role === 'observer' && observerCacheHydrated;
    if (!role || !ready) {
      setConnectionState('offline');
      setObserverConnected(false);
      return;
    }

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectDelayMs = 1_000;

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) {
        return;
      }
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, reconnectDelayMs);
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30_000);
    };

    const connect = async () => {
      setConnectionState('connecting');
      const accessToken = await getAccessToken();
      if (cancelled) {
        return;
      }
      if (!accessToken) {
        setConnectionState('offline');
        scheduleReconnect();
        return;
      }

      let socket: WebSocket;
      try {
        socket = new WebSocket(getRealtimeWebSocketUrl());
      } catch {
        setConnectionState('offline');
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        if (cancelled || socketRef.current !== socket) {
          socket.close();
          return;
        }
        reconnectDelayMs = 1_000;
        socket.send(JSON.stringify({
          protocolVersion: realtimeProtocolVersion,
          type: 'authenticate',
          accessToken,
        }));
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
            socket.close(4_003, 'role_mismatch');
            return;
          }
          authenticatedSocketRef.current = socket;
          setChatReady(true);
          sentWorkoutEventIdsRef.current.clear();
          if (role === 'owner') {
            setConnectionState('online');
            sendPendingWorkoutEvents();
          }
          return;
        }

        if (message.type === 'presence') {
          const presenceState = getRealtimePresenceState(
            role,
            message.ownerOnline,
            message.observerOnline,
          );
          setConnectionState(presenceState.connectionState);
          setObserverConnected(presenceState.observerConnected);
          observerOnlineRef.current = message.observerOnline;
          if (!message.observerOnline) {
            sentWorkoutEventIdsRef.current.clear();
          }
          if (role === 'owner' && message.requestSnapshot) {
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
          socket.close();
        }
      };
      socket.onclose = (event) => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (socketRef.current !== socket) {
          return;
        }
        socketRef.current = null;
        authenticatedSocketRef.current = null;
        setChatReady(false);
        observerOnlineRef.current = false;
        setConnectionState('offline');
        setObserverConnected(false);
        if (shouldReconnectRealtimeSocket(event.code)) {
          scheduleReconnect();
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
      const socket = socketRef.current;
      socketRef.current = null;
      authenticatedSocketRef.current = null;
      setChatReady(false);
      observerOnlineRef.current = false;
      socket?.close();
    };
  }, [
    appHydrated,
    getAccessToken,
    mergeObserverCache,
    observerCacheHydrated,
    ownerMetadata,
    receiveSnapshotChunk,
    replaceObserverCache,
    replaceOwnerMetadata,
    sendOwnerSnapshot,
    sendPendingWorkoutEvents,
    session?.role,
  ]);

  useEffect(() => {
    if (session?.role !== 'owner' || !ownerMetadata) {
      return;
    }

    const socket = authenticatedSocketRef.current;
    if (!isSocketOpen(socket)) {
      return;
    }

    for (const workoutSession of getSyncEligibleSessions(data.sessions, ownerMetadata)) {
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
  }, [data.sessions, ownerMetadata, sendPendingWorkoutEvents, session?.role]);

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
      observerConnected,
      observerSessions: observerCache.sessions,
      lastSyncedAt: observerCache.lastSyncedAt,
      chatEvent,
      chatError,
      sendChatMessage,
    }),
    [chatError, chatEvent, chatReady, connectionState, observerCache, observerConnected, sendChatMessage],
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
