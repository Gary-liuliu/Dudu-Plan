import type { WorkoutSession } from '../types';

export const realtimeProtocolVersion = 1;

export type ClientRealtimeMessage =
  | {
      protocolVersion: 1;
      type: 'snapshot';
      sentAt: string;
      payload: { sessions: WorkoutSession[] };
    }
  | {
      protocolVersion: 1;
      type: 'session_upsert';
      sentAt: string;
      payload: { session: WorkoutSession };
    }
  | {
      protocolVersion: 1;
      type: 'push_token';
      sentAt: string;
      payload: { token: string };
    }
  | {
      protocolVersion: 1;
      type: 'heartbeat';
      sentAt: string;
    };

export type ServerRealtimeMessage =
  | ClientRealtimeMessage
  | {
      protocolVersion: 1;
      type: 'presence';
      sentAt: string;
      roles: { owner: boolean; observer: boolean };
    }
  | {
      protocolVersion: 1;
      type: 'error';
      error: string;
    };

export function createRealtimeMessage<T extends ClientRealtimeMessage>(
  message: Omit<T, 'protocolVersion' | 'sentAt'>,
): T {
  return {
    ...message,
    protocolVersion: realtimeProtocolVersion,
    sentAt: new Date().toISOString(),
  } as T;
}

export function parseServerRealtimeMessage(value: string): ServerRealtimeMessage | null {
  try {
    const message = JSON.parse(value) as Partial<ServerRealtimeMessage>;
    return message.protocolVersion === realtimeProtocolVersion && typeof message.type === 'string'
      ? message as ServerRealtimeMessage
      : null;
  } catch {
    return null;
  }
}
