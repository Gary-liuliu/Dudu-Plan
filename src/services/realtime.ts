import { createRealtimeMessage } from '../domain/realtimeProtocol';
import type { OwnerSyncMetadata } from './ownerSyncStorage';
import type { AppRole, WorkoutSession } from '../types';

export const maximumRealtimeMessageBytes = 64 * 1_024;
export const maximumSnapshotSessionsPerMessage = 8;

interface SnapshotMessageOptions {
  maximumBytes?: number;
  maximumSessions?: number;
  snapshotId?: string;
}

interface RealtimePresenceState {
  peerConnected: boolean;
  observerConnected: boolean;
}

function createSnapshotId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function serializeSnapshotChunk(
  snapshotId: string,
  chunkIndex: number,
  chunkCount: number,
  sessions: WorkoutSession[],
): string {
  return JSON.stringify(createRealtimeMessage({
    type: 'snapshot',
    snapshotId,
    chunkIndex,
    chunkCount,
    sessions,
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
  const snapshotId = options.snapshotId ?? createSnapshotId();
  const chunks: WorkoutSession[][] = [];
  let currentChunk: WorkoutSession[] = [];

  const appendChunk = (chunk: WorkoutSession[]) => {
    const provisionalMessage = serializeSnapshotChunk(snapshotId, 9_999, 9_999, chunk);
    if (getRealtimeMessageByteLength(provisionalMessage) > maximumBytes) {
      throw new Error('单条训练记录超过实时同步大小限制。');
    }
    chunks.push(chunk);
  };

  for (const session of sessions) {
    if (currentChunk.length >= maximumSessions) {
      appendChunk(currentChunk);
      currentChunk = [];
    }

    const candidateChunk = [...currentChunk, session];
    if (
      getRealtimeMessageByteLength(
        serializeSnapshotChunk(snapshotId, 9_999, 9_999, candidateChunk),
      ) <= maximumBytes
    ) {
      currentChunk = candidateChunk;
      continue;
    }

    if (currentChunk.length > 0) {
      appendChunk(currentChunk);
      currentChunk = [];
    }
    appendChunk([session]);
  }

  if (currentChunk.length > 0 || chunks.length === 0) {
    appendChunk(currentChunk);
  }

  return chunks.map((chunk, chunkIndex) => {
    const message = serializeSnapshotChunk(snapshotId, chunkIndex, chunks.length, chunk);
    if (getRealtimeMessageByteLength(message) > maximumBytes) {
      throw new Error('快照分片超过实时同步大小限制。');
    }
    return message;
  });
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

export function getRealtimePresenceState(
  role: AppRole,
  ownerOnline: boolean,
  observerOnline: boolean,
): RealtimePresenceState {
  return role === 'owner'
    ? { peerConnected: observerOnline, observerConnected: observerOnline }
    : {
        peerConnected: ownerOnline,
        observerConnected: false,
      };
}

export function shouldSendOwnerSnapshot(
  observerWasOnline: boolean,
  observerOnline: boolean,
  snapshotRequested: boolean,
): boolean {
  return observerOnline && (!observerWasOnline || snapshotRequested);
}

export function shouldReconnectRealtimeSocket(closeCode: number): boolean {
  return closeCode !== 4_001;
}
