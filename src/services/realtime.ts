import { createRealtimeMessage } from '../domain/realtimeProtocol';
import type { WorkoutPushEvent } from './accountApi';
import type { OwnerSyncMetadata } from './ownerSyncStorage';
import type {
  AppRole,
  RealtimeConnectionState,
  WorkoutSession,
} from '../types';

export const maximumRealtimeMessageBytes = 64 * 1_024;
export const maximumSnapshotSessionsPerMessage = 8;

interface SnapshotMessageOptions {
  maximumBytes?: number;
  maximumSessions?: number;
}

interface RealtimePresenceState {
  connectionState: RealtimeConnectionState;
  observerConnected: boolean;
}

function serializeSnapshotMessage(sessions: WorkoutSession[]): string {
  return JSON.stringify(createRealtimeMessage({
    type: 'snapshot',
    payload: { sessions },
  }));
}

export function getRealtimeMessageByteLength(message: string): number {
  return new TextEncoder().encode(message).byteLength;
}

export function createOwnerSnapshotMessages(
  sessions: WorkoutSession[],
  options: SnapshotMessageOptions = {},
): string[] {
  const maximumBytes = options.maximumBytes ?? maximumRealtimeMessageBytes;
  const maximumSessions = options.maximumSessions ?? maximumSnapshotSessionsPerMessage;
  const messages: string[] = [];
  let currentBatch: WorkoutSession[] = [];

  const appendBatch = (batch: WorkoutSession[]) => {
    const message = serializeSnapshotMessage(batch);
    if (getRealtimeMessageByteLength(message) > maximumBytes) {
      throw new Error('单条训练记录超过实时同步大小限制。');
    }
    messages.push(message);
  };

  for (const session of sessions) {
    if (currentBatch.length >= maximumSessions) {
      appendBatch(currentBatch);
      currentBatch = [];
    }

    const candidateBatch = [...currentBatch, session];
    const candidateMessage = serializeSnapshotMessage(candidateBatch);
    if (getRealtimeMessageByteLength(candidateMessage) <= maximumBytes) {
      currentBatch = candidateBatch;
      continue;
    }

    if (currentBatch.length > 0) {
      appendBatch(currentBatch);
      currentBatch = [];
    }
    appendBatch([session]);
  }

  if (currentBatch.length > 0 || messages.length === 0) {
    appendBatch(currentBatch);
  }

  return messages;
}

export function initializeOwnerSyncMetadata(
  metadata: OwnerSyncMetadata,
  initializationStartedAt: string,
  activeSessionIds: string[],
): OwnerSyncMetadata {
  const storedSyncStartedAtMs = Date.parse(metadata.syncStartedAt);
  const initializationStartedAtMs = Date.parse(initializationStartedAt);
  const syncStartedAt =
    Number.isFinite(storedSyncStartedAtMs) &&
    (!Number.isFinite(initializationStartedAtMs) || storedSyncStartedAtMs <= initializationStartedAtMs)
      ? metadata.syncStartedAt
      : initializationStartedAt;
  const includedSessionIds = [...new Set([
    ...metadata.includedSessionIds,
    ...activeSessionIds,
  ])];

  return {
    ...metadata,
    syncStartedAt,
    includedSessionIds,
  };
}

export function markNotificationEventHandled(
  metadata: OwnerSyncMetadata,
  eventId: string,
): OwnerSyncMetadata {
  if (metadata.handledNotificationEventIds.includes(eventId)) {
    return metadata;
  }

  return {
    ...metadata,
    handledNotificationEventIds: [
      ...metadata.handledNotificationEventIds,
      eventId,
    ].slice(-200),
  };
}

export function getSendableWorkoutPushEvents(
  pendingEvents: Array<{ event: WorkoutPushEvent; expired: boolean }>,
): WorkoutPushEvent[] {
  return pendingEvents
    .filter(({ expired }) => !expired)
    .map(({ event }) => event);
}

export function getRealtimePresenceState(
  role: AppRole,
  roles: { owner: boolean; observer: boolean },
): RealtimePresenceState {
  return role === 'owner'
    ? { connectionState: 'online', observerConnected: roles.observer }
    : {
        connectionState: roles.owner ? 'online' : 'offline',
        observerConnected: false,
      };
}

export function shouldReconnectRealtimeSocket(closeCode: number): boolean {
  return closeCode !== 4_001;
}

export function beginNotificationEvent(
  inFlightEventIds: Set<string>,
  eventId: string,
): boolean {
  if (inFlightEventIds.size > 0) {
    return false;
  }
  inFlightEventIds.add(eventId);
  return true;
}
