import type { WorkoutEventType } from './realtimeProtocol';
import type { OwnerSyncMetadata } from '../services/ownerSyncStorage';
import type { WorkoutSession } from '../types';

const notificationRetryWindowMs = 30 * 60 * 1_000;

export function mergeWorkoutSessions(
  existingSessions: WorkoutSession[],
  incomingSessions: WorkoutSession[],
): WorkoutSession[] {
  const sessionsById = new Map(existingSessions.map((session) => [session.id, session]));

  for (const incomingSession of incomingSessions) {
    const existingSession = sessionsById.get(incomingSession.id);
    if (
      !existingSession ||
      Date.parse(incomingSession.updatedAt) >= Date.parse(existingSession.updatedAt)
    ) {
      sessionsById.set(incomingSession.id, incomingSession);
    }
  }

  return [...sessionsById.values()].sort(
    (left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt),
  );
}

export function getSyncEligibleSessions(
  sessions: WorkoutSession[],
  metadata: OwnerSyncMetadata,
): WorkoutSession[] {
  const includedSessionIds = new Set(metadata.includedSessionIds);
  const syncStartedAtMs = Date.parse(metadata.syncStartedAt);
  return sessions.filter(
    (session) =>
      includedSessionIds.has(session.id) || Date.parse(session.startedAt) >= syncStartedAtMs,
  );
}

export function getPendingWorkoutPushEvents(
  sessions: WorkoutSession[],
  metadata: OwnerSyncMetadata,
  nowMs = Date.now(),
): Array<{
  event: { id: string; type: WorkoutEventType; data: { sessionId: string } };
  expired: boolean;
}> {
  const handledEventIds = new Set(metadata.handledNotificationEventIds);
  const pendingEvents: Array<{
    event: { id: string; type: WorkoutEventType; data: { sessionId: string } };
    expired: boolean;
  }> = [];

  for (const session of getSyncEligibleSessions(sessions, metadata)) {
    const startEventId = `${session.id}:workout_started`;
    if (!handledEventIds.has(startEventId)) {
      const startedAtMs = Date.parse(session.startedAt);
      pendingEvents.push({
        event: {
          id: startEventId,
          type: 'workout_started',
          data: { sessionId: session.id },
        },
        expired: !Number.isFinite(startedAtMs) || nowMs - startedAtMs > notificationRetryWindowMs,
      });
    }

    if (session.status === 'completed' && session.completedAt) {
      const completedEventId = `${session.id}:workout_completed`;
      if (!handledEventIds.has(completedEventId)) {
        const completedAtMs = Date.parse(session.completedAt);
        pendingEvents.push({
          event: {
            id: completedEventId,
            type: 'workout_completed',
          data: { sessionId: session.id },
          },
          expired:
            !Number.isFinite(completedAtMs) || nowMs - completedAtMs > notificationRetryWindowMs,
        });
      }
    }
  }

  return pendingEvents;
}
