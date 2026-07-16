import type { ChatMessage, ChatMessageType, WorkoutSession } from '../types';

export const realtimeProtocolVersion = 2;

export type WorkoutEventType = 'workout_started' | 'workout_completed';

export type ClientRealtimeMessage =
  | {
      protocolVersion: 2;
      type: 'authenticate';
      accessToken: string;
    }
  | {
      protocolVersion: 2;
      type: 'snapshot';
      sentAt: number;
      snapshotId: string;
      chunkIndex: number;
      chunkCount: number;
      sessions: WorkoutSession[];
    }
  | {
      protocolVersion: 2;
      type: 'session_upsert';
      sentAt: number;
      session: WorkoutSession;
    }
  | {
      protocolVersion: 2;
      type: 'workout_event';
      sentAt: number;
      eventId: string;
      sessionId: string;
      eventType: WorkoutEventType;
    }
  | {
      protocolVersion: 2;
      type: 'event_ack';
      sentAt: number;
      eventId: string;
    }
  | {
      protocolVersion: 2;
      type: 'chat_message';
      sentAt: number;
      messageId: string;
      messageType: ChatMessageType;
      content: string;
      replyToMessageId: string | null;
      clientCreatedAt: number;
    }
  | {
      protocolVersion: 2;
      type: 'heartbeat';
      sentAt: number;
    };

export type ServerRealtimeMessage =
  | Exclude<ClientRealtimeMessage, { type: 'authenticate' } | { type: 'chat_message' }>
  | {
      protocolVersion: 2;
      type: 'authenticated';
      role: 'owner' | 'observer';
      serverTime: number;
      accessTokenExpiresAt: number;
    }
  | {
      protocolVersion: 2;
      type: 'presence';
      ownerOnline: boolean;
      observerOnline: boolean;
      requestSnapshot?: boolean;
      serverTime: number;
    }
  | {
      protocolVersion: 2;
      type: 'chat_message' | 'chat_saved';
      message: ChatMessage;
    }
  | {
      protocolVersion: 2;
      type: 'chat_delivered';
      messageIds: string[];
      deliveredAt: number;
    }
  | {
      protocolVersion: 2;
      type: 'chat_read';
      upToMessageId: string;
      readAt: number;
      updatedCount: number;
    }
  | {
      protocolVersion: 2;
      type: 'chat_recalled';
      message: ChatMessage;
    }
  | {
      protocolVersion: 2;
      type: 'error';
      error: string;
      messageId?: string;
      serverTime?: number;
    };

export type ChatServerRealtimeMessage = Extract<
  ServerRealtimeMessage,
  { type: 'chat_message' | 'chat_saved' | 'chat_delivered' | 'chat_read' | 'chat_recalled' }
>;

export function createRealtimeMessage<
  T extends Exclude<ClientRealtimeMessage, { type: 'authenticate' }>,
>(
  message: Omit<T, 'protocolVersion' | 'sentAt'>,
): T {
  return {
    ...message,
    protocolVersion: realtimeProtocolVersion,
    sentAt: Date.now(),
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
