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
  getChatMessages,
  getChatUnreadCount,
  markChatDelivered,
  markChatRead,
  recallChatMessage,
} from '../services/accountApi';
import {
  loadChatMessages,
  mergeChatMessages,
  saveChatMessages,
} from '../services/chatStorage';
import type { ChatMessage, ChatMessageType } from '../types';
import { useAccountStore } from './AccountStore';
import { useRealtimeStore } from './RealtimeStore';

interface ChatStoreValue {
  hydrated: boolean;
  messages: ChatMessage[];
  unreadCount: number;
  loadingOlder: boolean;
  hasOlder: boolean;
  sendMessage: (
    content: string,
    messageType?: ChatMessageType,
    replyToMessageId?: string | null,
  ) => void;
  retryMessage: (messageId: string) => void;
  recallMessage: (messageId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  loadOlder: () => Promise<void>;
}

const ChatStoreContext = createContext<ChatStoreValue | null>(null);

function createMessageId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
}

// [Function] Maintains role-isolated chat cache and server state. [Warning] A failed send must retain its original messageId for idempotent retry.
export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const { session, getAccessToken } = useAccountStore();
  const realtime = useRealtimeStore();
  const sendRealtimeChatMessage = realtime.sendChatMessage;
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);
  const messagesRef = useRef<ChatMessage[]>([]);
  const writeRef = useRef<Promise<void>>(Promise.resolve());
  const sendAttemptAtRef = useRef(new Map<string, number>());

  const replaceMessages = useCallback((nextMessages: ChatMessage[]) => {
    const role = session?.role;
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    if (!role) {
      return;
    }
    const write = writeRef.current
      .catch(() => undefined)
      .then(() => saveChatMessages(role, nextMessages));
    writeRef.current = write.catch(() => undefined);
  }, [session?.role]);

  const mergeMessages = useCallback((incomingMessages: ChatMessage[]) => {
    replaceMessages(mergeChatMessages(messagesRef.current, incomingMessages));
  }, [replaceMessages]);

  const deliverMessages = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) {
      return;
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return;
    }
    try {
      mergeMessages(await markChatDelivered(accessToken, messageIds));
    } catch {
      return;
    }
  }, [getAccessToken, mergeMessages]);

  useEffect(() => {
    const role = session?.role;
    if (!role) {
      messagesRef.current = [];
      setMessages([]);
      setUnreadCount(0);
      setHydrated(false);
      return;
    }

    let cancelled = false;
    setHydrated(false);
    void loadChatMessages(role)
      .then(async (cachedMessages) => {
        if (cancelled) {
          return;
        }
        messagesRef.current = cachedMessages;
        setMessages(cachedMessages);
        setHydrated(true);

        const accessToken = await getAccessToken();
        if (!accessToken || cancelled) {
          return;
        }
        const [historyOutcome, unreadOutcome] = await Promise.allSettled([
          getChatMessages(accessToken),
          getChatUnreadCount(accessToken),
        ]);
        if (cancelled) {
          return;
        }
        if (historyOutcome.status === 'fulfilled') {
          const historyResult = historyOutcome.value;
          replaceMessages(mergeChatMessages(messagesRef.current, historyResult.items));
          setHasOlder(historyResult.nextCursor !== null);
          const undeliveredIds = historyResult.items
            .filter((message) =>
              message.receiverRole === role && message.deliveredAt === null && message.recalledAt === null)
            .map((message) => message.messageId);
          void deliverMessages(undeliveredIds);
        }
        if (unreadOutcome.status === 'fulfilled') {
          setUnreadCount(unreadOutcome.value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deliverMessages, getAccessToken, replaceMessages, session?.role]);

  useEffect(() => {
    const realtimeEvent = realtime.chatEvent?.event;
    const role = session?.role;
    if (!realtimeEvent || !role) {
      return;
    }

    if (realtimeEvent.type === 'chat_message' || realtimeEvent.type === 'chat_saved') {
      sendAttemptAtRef.current.delete(realtimeEvent.message.messageId);
      mergeMessages([realtimeEvent.message]);
      if (realtimeEvent.type === 'chat_message' && realtimeEvent.message.receiverRole === role) {
        setUnreadCount((count) => count + (realtimeEvent.message.recalledAt === null ? 1 : 0));
        void deliverMessages([realtimeEvent.message.messageId]);
      }
      return;
    }

    if (realtimeEvent.type === 'chat_delivered') {
      const messageIds = new Set(realtimeEvent.messageIds);
      replaceMessages(messagesRef.current.map((message) =>
        messageIds.has(message.messageId)
          ? { ...message, deliveredAt: message.deliveredAt ?? realtimeEvent.deliveredAt }
          : message));
      return;
    }

    if (realtimeEvent.type === 'chat_read') {
      const boundary = messagesRef.current.find(
        (message) => message.messageId === realtimeEvent.upToMessageId,
      );
      replaceMessages(messagesRef.current.map((message) =>
        boundary?.id !== null && boundary?.id !== undefined &&
        message.id !== null && message.id <= boundary.id && message.senderRole === role
          ? {
              ...message,
              deliveredAt: message.deliveredAt ?? realtimeEvent.readAt,
              readAt: message.readAt ?? realtimeEvent.readAt,
            }
          : message));
      return;
    }

    if (realtimeEvent.type === 'chat_recalled') {
      mergeMessages([realtimeEvent.message]);
      if (realtimeEvent.message.receiverRole === role) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    }
  }, [deliverMessages, mergeMessages, realtime.chatEvent, replaceMessages, session?.role]);

  useEffect(() => {
    const chatError = realtime.chatError;
    if (!chatError?.messageId) {
      return;
    }
    sendAttemptAtRef.current.delete(chatError.messageId);
    replaceMessages(messagesRef.current.map((message) =>
      message.messageId === chatError.messageId && message.id === null
        ? { ...message, localState: 'failed' }
        : message));
  }, [realtime.chatError, replaceMessages]);

  const sendStoredMessage = useCallback((message: ChatMessage) => {
    const accepted = sendRealtimeChatMessage({
      messageId: message.messageId,
      messageType: message.messageType,
      content: message.content ?? '',
      replyToMessageId: message.replyToMessageId,
      clientCreatedAt: message.clientCreatedAt,
    });
    if (accepted) {
      if (!sendAttemptAtRef.current.has(message.messageId)) {
        sendAttemptAtRef.current.set(message.messageId, Date.now());
      }
    } else {
      sendAttemptAtRef.current.delete(message.messageId);
    }
    replaceMessages(messagesRef.current.map((candidate) =>
      candidate.messageId === message.messageId
        ? { ...candidate, localState: accepted ? 'sending' : 'failed' }
        : candidate));
  }, [replaceMessages, sendRealtimeChatMessage]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const timedOutMessageIds = new Set(
        [...sendAttemptAtRef.current.entries()]
          .filter(([, sentAt]) => now - sentAt >= 12_000)
          .map(([messageId]) => messageId),
      );
      if (timedOutMessageIds.size === 0) {
        return;
      }
      for (const messageId of timedOutMessageIds) {
        sendAttemptAtRef.current.delete(messageId);
      }
      replaceMessages(messagesRef.current.map((message) =>
        timedOutMessageIds.has(message.messageId) && message.id === null
          ? { ...message, localState: 'failed' }
          : message));
    }, 3_000);
    return () => clearInterval(timer);
  }, [replaceMessages]);

  const sendMessage = useCallback((
    content: string,
    messageType: ChatMessageType = 'text',
    replyToMessageId: string | null = null,
  ) => {
    const role = session?.role;
    const normalizedContent = content.trim();
    if (!role || !normalizedContent || Array.from(normalizedContent).length > 2_000) {
      return;
    }
    const clientCreatedAt = Date.now();
    const message: ChatMessage = {
      id: null,
      messageId: createMessageId(),
      senderRole: role,
      receiverRole: role === 'owner' ? 'observer' : 'owner',
      messageType,
      content: normalizedContent,
      replyToMessageId,
      clientCreatedAt,
      serverCreatedAt: null,
      deliveredAt: null,
      readAt: null,
      recalledAt: null,
      localState: 'sending',
    };
    mergeMessages([message]);
    sendStoredMessage(message);
  }, [mergeMessages, sendStoredMessage, session?.role]);

  const retryMessage = useCallback((messageId: string) => {
    const message = messagesRef.current.find((candidate) => candidate.messageId === messageId);
    if (message?.localState === 'failed' && message.content) {
      sendStoredMessage(message);
    }
  }, [sendStoredMessage]);

  useEffect(() => {
    if (!hydrated || !realtime.chatReady) {
      return;
    }
    for (const message of messagesRef.current) {
      if (message.id === null && message.localState === 'sending' && message.content) {
        sendStoredMessage(message);
      }
    }
  }, [hydrated, realtime.chatReady, sendStoredMessage]);

  const recallMessage = useCallback(async (messageId: string) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return;
    }
    mergeMessages([await recallChatMessage(accessToken, messageId)]);
  }, [getAccessToken, mergeMessages]);

  const markAllRead = useCallback(async () => {
    const role = session?.role;
    if (!role) {
      return;
    }
    const boundary = messagesRef.current
      .filter((message) => message.receiverRole === role && message.id !== null && message.recalledAt === null)
      .at(-1);
    if (!boundary) {
      setUnreadCount(0);
      return;
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return;
    }
    await markChatRead(accessToken, boundary.messageId);
    const readAt = Date.now();
    replaceMessages(messagesRef.current.map((message) =>
      message.receiverRole === role && message.id !== null && message.id <= boundary.id!
        ? {
            ...message,
            deliveredAt: message.deliveredAt ?? readAt,
            readAt: message.readAt ?? readAt,
          }
        : message));
    setUnreadCount(0);
  }, [getAccessToken, replaceMessages, session?.role]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasOlder) {
      return;
    }
    const oldestId = messagesRef.current.find((message) => message.id !== null)?.id;
    const accessToken = await getAccessToken();
    if (!accessToken || !oldestId) {
      return;
    }
    setLoadingOlder(true);
    try {
      const result = await getChatMessages(accessToken, oldestId);
      mergeMessages(result.items);
      setHasOlder(result.nextCursor !== null);
      const role = session?.role;
      if (role) {
        void deliverMessages(result.items
          .filter((message) =>
            message.receiverRole === role && message.deliveredAt === null && message.recalledAt === null)
          .map((message) => message.messageId));
      }
    } finally {
      setLoadingOlder(false);
    }
  }, [deliverMessages, getAccessToken, hasOlder, loadingOlder, mergeMessages, session?.role]);

  const value = useMemo<ChatStoreValue>(() => ({
    hydrated,
    messages,
    unreadCount,
    loadingOlder,
    hasOlder,
    sendMessage,
    retryMessage,
    recallMessage,
    markAllRead,
    loadOlder,
  }), [
    hasOlder,
    hydrated,
    loadOlder,
    loadingOlder,
    markAllRead,
    messages,
    recallMessage,
    retryMessage,
    sendMessage,
    unreadCount,
  ]);

  return <ChatStoreContext.Provider value={value}>{children}</ChatStoreContext.Provider>;
}

export function useChatStore(): ChatStoreValue {
  const context = useContext(ChatStoreContext);
  if (!context) {
    throw new Error('useChatStore must be used within ChatStoreProvider.');
  }
  return context;
}
