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
  createRealtimeMessage,
  parseServerRealtimeMessage,
} from '../domain/realtimeProtocol';
import {
  getPendingWorkoutPushEvents,
  getSyncEligibleSessions,
} from '../domain/sync';
import {
  getRealtimeWebSocketUrl,
  sendWorkoutPush,
} from '../services/accountApi';
import { getObserverPushToken } from '../services/notifications';
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
  beginNotificationEvent,
  createOwnerSnapshotMessages,
  getSendableWorkoutPushEvents,
  getRealtimePresenceState,
  initializeOwnerSyncMetadata,
  markNotificationEventHandled,
  shouldReconnectRealtimeSocket,
} from '../services/realtime';
import type {
  ObserverCache,
  RealtimeConnectionState,
  WorkoutSession,
} from '../types';
import { useAccountStore } from './AccountStore';
import { useAppStore } from './AppStore';

interface RealtimeStoreValue {
  connectionState: RealtimeConnectionState;
  observerConnected: boolean;
  observerSessions: WorkoutSession[];
  lastSyncedAt: string | null;
}

const RealtimeStoreContext = createContext<RealtimeStoreValue | null>(null);

const initialObserverCache: ObserverCache = {
  version: 1,
  sessions: [],
  lastSyncedAt: null,
};

function isSocketOpen(socket: WebSocket | null): socket is WebSocket {
  return socket?.readyState === WebSocket.OPEN;
}

// [Function] Bridges local workout state with the transient relay. [Warning] Local training must remain usable when every network call fails.
export function RealtimeStoreProvider({ children }: { children: ReactNode }) {
  const { session, getAccessToken } = useAccountStore();
  const { data, hydrated: appHydrated } = useAppStore();
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('offline');
  const [observerConnected, setObserverConnected] = useState(false);
  const [observerCache, setObserverCache] = useState<ObserverCache>(initialObserverCache);
  const [observerCacheHydrated, setObserverCacheHydrated] = useState(false);
  const [ownerMetadata, setOwnerMetadata] = useState<OwnerSyncMetadata | null>(null);
  const [notificationRetryTick, setNotificationRetryTick] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const sessionsRef = useRef(data.sessions);
  const ownerMetadataRef = useRef<OwnerSyncMetadata | null>(null);
  const ownerMetadataWriteRef = useRef<Promise<void>>(Promise.resolve());
  const observerCacheRef = useRef(observerCache);
  const observerCacheWriteRef = useRef<Promise<void>>(Promise.resolve());
  const sentSessionVersionsRef = useRef(new Map<string, string>());
  const notificationEventsInFlightRef = useRef(new Set<string>());
  const notificationRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationRetryDelayMsRef = useRef(5_000);

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

  const clearNotificationRetry = useCallback(() => {
    if (notificationRetryTimerRef.current) {
      clearTimeout(notificationRetryTimerRef.current);
      notificationRetryTimerRef.current = null;
    }
    notificationRetryDelayMsRef.current = 5_000;
  }, []);

  const scheduleNotificationRetry = useCallback(() => {
    if (notificationRetryTimerRef.current) {
      return;
    }

    const delayMs = notificationRetryDelayMsRef.current;
    notificationRetryTimerRef.current = setTimeout(() => {
      notificationRetryTimerRef.current = null;
      setNotificationRetryTick((tick) => tick + 1);
    }, delayMs);
    notificationRetryDelayMsRef.current = Math.min(delayMs * 2, 60_000);
  }, []);

  useEffect(() => clearNotificationRetry, [clearNotificationRetry]);

  useEffect(() => {
    if (!appHydrated || session?.role !== 'owner') {
      setOwnerMetadata(null);
      ownerMetadataRef.current = null;
      return;
    }

    let cancelled = false;
    const initializationStartedAt = new Date().toISOString();
    const initiallyActiveSessionIds = sessionsRef.current
      .filter((workoutSession) => workoutSession.status === 'in_progress')
      .map((workoutSession) => workoutSession.id);
    void loadOrCreateOwnerSyncMetadata(initiallyActiveSessionIds)
      .then((metadata) => {
        if (cancelled) {
          return;
        }
        const currentlyActiveSessionIds = sessionsRef.current
          .filter((workoutSession) => workoutSession.status === 'in_progress')
          .map((workoutSession) => workoutSession.id);
        const initializedMetadata = initializeOwnerSyncMetadata(
          metadata,
          initializationStartedAt,
          [...initiallyActiveSessionIds, ...currentlyActiveSessionIds],
        );
        void replaceOwnerMetadata(initializedMetadata).catch(() => undefined);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        const fallbackMetadata = initializeOwnerSyncMetadata({
          version: 1,
          syncStartedAt: initializationStartedAt,
          includedSessionIds: initiallyActiveSessionIds,
          observerPushToken: null,
          handledNotificationEventIds: [],
        }, initializationStartedAt, sessionsRef.current
          .filter((workoutSession) => workoutSession.status === 'in_progress')
          .map((workoutSession) => workoutSession.id));
        void replaceOwnerMetadata(fallbackMetadata).catch(() => undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [appHydrated, replaceOwnerMetadata, session?.role]);

  const ownerMetadataReady = ownerMetadata !== null;

  useEffect(() => {
    if (session?.role !== 'observer') {
      setObserverCacheHydrated(false);
      return;
    }

    let cancelled = false;
    setObserverCacheHydrated(false);
    void loadObserverCache()
      .then((cache) => {
        if (cancelled) {
          return;
        }
        observerCacheRef.current = cache;
        setObserverCache(cache);
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

  const sendOwnerSnapshot = useCallback(() => {
    const socket = socketRef.current;
    const metadata = ownerMetadataRef.current;
    if (!isSocketOpen(socket) || !metadata) {
      return;
    }

    const sessions = getSyncEligibleSessions(sessionsRef.current, metadata);
    let snapshotMessages: string[];
    try {
      snapshotMessages = createOwnerSnapshotMessages(sessions);
      for (const message of snapshotMessages) {
        if (!isSocketOpen(socket) || socketRef.current !== socket) {
          return;
        }
        socket.send(message);
      }
    } catch {
      return;
    }
    sentSessionVersionsRef.current = new Map(
      sessions.map((workoutSession) => [workoutSession.id, workoutSession.updatedAt]),
    );
  }, []);

  const mergeObserverCache = useCallback((incomingSessions: WorkoutSession[]) => {
    const nextCache: ObserverCache = {
      version: 1,
      sessions: mergeObserverSessions(observerCacheRef.current.sessions, incomingSessions),
      lastSyncedAt: new Date().toISOString(),
    };
    observerCacheRef.current = nextCache;
    setObserverCache(nextCache);
    const write = observerCacheWriteRef.current
      .catch(() => undefined)
      .then(() => saveObserverCache(nextCache));
    observerCacheWriteRef.current = write.catch(() => undefined);
  }, []);

  useEffect(() => {
    const role = session?.role;
    const ready = role === 'owner'
      ? appHydrated && ownerMetadataReady
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
    let observerPushTokenRequest: Promise<string | null> | null = null;

    const sendObserverPushToken = (socket: WebSocket, refreshToken = false) => {
      if (role !== 'observer') {
        return;
      }
      if (refreshToken || !observerPushTokenRequest) {
        observerPushTokenRequest = getObserverPushToken().catch(() => null);
      }
      void observerPushTokenRequest.then((token) => {
        if (token && isSocketOpen(socket) && socketRef.current === socket) {
          socket.send(JSON.stringify(createRealtimeMessage({
            type: 'push_token',
            payload: { token },
          })));
        }
      });
    };

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
        socket = new WebSocket(getRealtimeWebSocketUrl(accessToken));
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
        if (role === 'owner') {
          setConnectionState('online');
          sendOwnerSnapshot();
        }
        heartbeatTimer = setInterval(() => {
          if (isSocketOpen(socket)) {
            socket.send(JSON.stringify(createRealtimeMessage({ type: 'heartbeat' })));
          }
        }, 25_000);

        if (role === 'observer') {
          sendObserverPushToken(socket, true);
        }
      };

      socket.onmessage = (event) => {
        if (socketRef.current !== socket || typeof event.data !== 'string') {
          return;
        }
        const message = parseServerRealtimeMessage(event.data);
        if (!message) {
          return;
        }

        if (message.type === 'presence') {
          const presenceState = getRealtimePresenceState(role, message.roles);
          setConnectionState(presenceState.connectionState);
          setObserverConnected(presenceState.observerConnected);
          if (role === 'owner' && message.roles.observer) {
            sendOwnerSnapshot();
          }
          if (role === 'observer' && message.roles.owner) {
            sendObserverPushToken(socket);
          }
          return;
        }

        if (role === 'observer' && message.type === 'snapshot') {
          mergeObserverCache(message.payload.sessions);
          return;
        }

        if (role === 'observer' && message.type === 'session_upsert') {
          mergeObserverCache([message.payload.session]);
          return;
        }

        if (role === 'owner' && message.type === 'push_token') {
          const metadata = ownerMetadataRef.current;
          if (metadata && metadata.observerPushToken !== message.payload.token) {
            void replaceOwnerMetadata({
              ...metadata,
              observerPushToken: message.payload.token,
            }).catch(() => undefined);
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
      socket?.close();
    };
  }, [
    appHydrated,
    getAccessToken,
    mergeObserverCache,
    observerCacheHydrated,
    ownerMetadataReady,
    replaceOwnerMetadata,
    sendOwnerSnapshot,
    session?.role,
  ]);

  useEffect(() => {
    if (session?.role !== 'owner' || !ownerMetadata) {
      return;
    }

    const socket = socketRef.current;
    if (!isSocketOpen(socket)) {
      return;
    }

    for (const workoutSession of getSyncEligibleSessions(data.sessions, ownerMetadata)) {
      if (sentSessionVersionsRef.current.get(workoutSession.id) === workoutSession.updatedAt) {
        continue;
      }
      socket.send(JSON.stringify(createRealtimeMessage({
        type: 'session_upsert',
        payload: { session: workoutSession },
      })));
      sentSessionVersionsRef.current.set(workoutSession.id, workoutSession.updatedAt);
    }
  }, [data.sessions, ownerMetadata, session?.role]);

  useEffect(() => {
    if (
      session?.role !== 'owner' ||
      !ownerMetadata?.observerPushToken
    ) {
      clearNotificationRetry();
      return;
    }

    const pendingEvents = getSendableWorkoutPushEvents(
      getPendingWorkoutPushEvents(data.sessions, ownerMetadata),
    );
    if (pendingEvents.length === 0) {
      clearNotificationRetry();
      return;
    }
    if (notificationRetryTimerRef.current) {
      return;
    }

    for (const pendingEvent of pendingEvents) {
      if (!beginNotificationEvent(
        notificationEventsInFlightRef.current,
        pendingEvent.id,
      )) {
        continue;
      }

      let pushAccepted = false;
      void getAccessToken()
        .then((accessToken) => accessToken
          ? sendWorkoutPush(
              accessToken,
              ownerMetadata.observerPushToken!,
              pendingEvent,
            )
          : Promise.reject(new Error('No access token')))
        .then(() => {
          pushAccepted = true;
          const metadata = ownerMetadataRef.current;
          if (!metadata) {
            return;
          }
          notificationRetryDelayMsRef.current = 5_000;
          return replaceOwnerMetadata(
            markNotificationEventHandled(metadata, pendingEvent.id),
          );
        })
        .catch(() => scheduleNotificationRetry())
        .finally(() => {
          notificationEventsInFlightRef.current.delete(pendingEvent.id);
          if (pushAccepted) {
            setNotificationRetryTick((tick) => tick + 1);
          }
        });
    }
  }, [
    clearNotificationRetry,
    data.sessions,
    getAccessToken,
    notificationRetryTick,
    ownerMetadata,
    replaceOwnerMetadata,
    scheduleNotificationRetry,
    session?.role,
  ]);

  const value = useMemo<RealtimeStoreValue>(
    () => ({
      connectionState,
      observerConnected,
      observerSessions: observerCache.sessions,
      lastSyncedAt: observerCache.lastSyncedAt,
    }),
    [connectionState, observerCache, observerConnected],
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
