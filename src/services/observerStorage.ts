import AsyncStorage from '@react-native-async-storage/async-storage';

import { mergeWorkoutSessions } from '../domain/sync';
import type { ObserverCache, WorkoutSession } from '../types';

const observerCacheKey = '@dudu-plan/observer-cache/v1';

const emptyObserverCache: ObserverCache = {
  version: 1,
  sessions: [],
  lastSyncedAt: null,
};

function normalizeSession(value: unknown): WorkoutSession | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const session = value as Partial<WorkoutSession>;
  if (typeof session.id !== 'string' || typeof session.startedAt !== 'string') {
    return null;
  }

  return {
    ...(session as WorkoutSession),
    updatedAt:
      typeof session.updatedAt === 'string'
        ? session.updatedAt
        : session.completedAt ?? session.startedAt,
  };
}

export function mergeObserverSessions(
  existingSessions: WorkoutSession[],
  incomingSessions: WorkoutSession[],
): WorkoutSession[] {
  return mergeWorkoutSessions(existingSessions, incomingSessions);
}

export async function loadObserverCache(): Promise<ObserverCache> {
  try {
    const storedValue = await AsyncStorage.getItem(observerCacheKey);
    if (!storedValue) {
      return emptyObserverCache;
    }

    const value = JSON.parse(storedValue) as Partial<ObserverCache>;
    return {
      version: 1,
      sessions: Array.isArray(value.sessions)
        ? value.sessions
            .map(normalizeSession)
            .filter((session): session is WorkoutSession => session !== null)
        : [],
      lastSyncedAt: typeof value.lastSyncedAt === 'string' ? value.lastSyncedAt : null,
    };
  } catch {
    return emptyObserverCache;
  }
}

export async function saveObserverCache(cache: ObserverCache): Promise<void> {
  await AsyncStorage.setItem(observerCacheKey, JSON.stringify(cache));
}
