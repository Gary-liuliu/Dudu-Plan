import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppRole, ChatMessage } from '../types';

const maximumCachedMessages = 500;

function getChatStorageKey(role: AppRole): string {
  return `@dudu-plan/chat-cache/v1/${role}`;
}

export function mergeChatMessages(
  existingMessages: ChatMessage[],
  incomingMessages: ChatMessage[],
): ChatMessage[] {
  const messagesById = new Map(existingMessages.map((message) => [message.messageId, message]));
  for (const incomingMessage of incomingMessages) {
    const existingMessage = messagesById.get(incomingMessage.messageId);
    messagesById.set(incomingMessage.messageId, {
      ...existingMessage,
      ...incomingMessage,
      localState: incomingMessage.id !== null ? undefined : incomingMessage.localState,
    });
  }
  return [...messagesById.values()]
    .sort((left, right) => {
      if (left.id !== null && right.id !== null) {
        return left.id - right.id;
      }
      return left.clientCreatedAt - right.clientCreatedAt;
    })
    .slice(-maximumCachedMessages);
}

export async function loadChatMessages(role: AppRole): Promise<ChatMessage[]> {
  try {
    const storedValue = await AsyncStorage.getItem(getChatStorageKey(role));
    if (!storedValue) {
      return [];
    }
    const messages = JSON.parse(storedValue) as unknown;
    return Array.isArray(messages) ? messages as ChatMessage[] : [];
  } catch {
    return [];
  }
}

export async function saveChatMessages(role: AppRole, messages: ChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(
    getChatStorageKey(role),
    JSON.stringify(messages.slice(-maximumCachedMessages)),
  );
}
