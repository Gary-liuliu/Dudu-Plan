import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, Reply, Send } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccountStore } from '../state/AccountStore';
import { useChatStore } from '../state/ChatStore';
import { useRealtimeStore } from '../state/RealtimeStore';
import { colors } from '../theme';
import type { ChatMessage } from '../types';

interface ChatScreenProps {
  onClose: () => void;
}

function formatMessageTime(timestamp: number | null): string {
  const date = new Date(timestamp ?? Date.now());
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getMessageDateKey(message: ChatMessage): string {
  const date = new Date(message.serverCreatedAt ?? message.clientCreatedAt);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatMessageDate(message: ChatMessage): string {
  const date = new Date(message.serverCreatedAt ?? message.clientCreatedAt);
  const today = new Date();
  return getMessageDateKey(message) === `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    ? '今天'
    : `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getMessageState(message: ChatMessage): string {
  if (message.localState === 'failed') return '发送失败 · 点按重试';
  if (message.localState === 'sending') return '发送中';
  if (message.readAt) return '已读';
  if (message.deliveredAt) return '已送达';
  return '已保存';
}

export function ChatScreen({ onClose }: ChatScreenProps) {
  const { session } = useAccountStore();
  const chat = useChatStore();
  const realtime = useRealtimeStore();
  const [draft, setDraft] = useState('');
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const role = session?.role;
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const lastMessageId = chat.messages.at(-1)?.messageId ?? null;
  const replyMessage = useMemo(
    () => chat.messages.find((message) => message.messageId === replyToMessageId) ?? null,
    [chat.messages, replyToMessageId],
  );

  useEffect(() => {
    void chat.markAllRead().catch(() => undefined);
  }, [chat.markAllRead]);

  useEffect(() => {
    if (chat.unreadCount > 0) {
      void chat.markAllRead().catch(() => undefined);
    }
  }, [chat.markAllRead, chat.unreadCount]);

  useEffect(() => {
    if (!lastMessageId) {
      return;
    }
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [lastMessageId]);

  const submit = () => {
    if (!draft.trim()) {
      return;
    }
    chat.sendMessage(draft, 'text', replyToMessageId);
    setDraft('');
    setReplyToMessageId(null);
  };

  const openMessageActions = (message: ChatMessage) => {
    if (message.recalledAt) {
      return;
    }
    const actions = [
      { text: '回复', onPress: () => setReplyToMessageId(message.messageId) },
      ...(message.content ? [{
        text: '复制',
        onPress: () => { void Clipboard.setStringAsync(message.content ?? ''); },
      }] : []),
      ...(message.senderRole === role && message.id !== null &&
      Date.now() - (message.serverCreatedAt ?? 0) <= 120_000
        ? [{
            text: '撤回',
            style: 'destructive' as const,
            onPress: () => { void chat.recallMessage(message.messageId).catch(() => undefined); },
          }]
        : []),
      { text: '取消', style: 'cancel' as const },
    ];
    Alert.alert('消息操作', undefined, actions);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardRoot}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="返回" onPress={onClose} style={styles.headerButton}>
            <ArrowLeft color={colors.ink} size={23} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{role === 'owner' ? '肚肚' : '嘟嘟'}</Text>
            <Text style={styles.subtitle}>
              {realtime.chatReady ? '只属于我们的聊天' : '正在连接，消息会自动发送'}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          ref={listRef}
          contentContainerStyle={styles.messageList}
          data={chat.messages}
          keyExtractor={(message) => message.messageId}
          onRefresh={() => { void chat.loadOlder(); }}
          refreshing={chat.loadingOlder}
          ListHeaderComponent={chat.hasOlder ? (
            <Pressable onPress={() => { void chat.loadOlder(); }} style={styles.loadOlder}>
              <Text style={styles.loadOlderText}>{chat.loadingOlder ? '加载中…' : '加载更早消息'}</Text>
            </Pressable>
          ) : null}
          renderItem={({ item, index }) => {
            const isMine = item.senderRole === role;
            const previousMessage = index > 0 ? chat.messages[index - 1] : null;
            const showDate = !previousMessage || getMessageDateKey(previousMessage) !== getMessageDateKey(item);
            const repliedMessage = item.replyToMessageId
              ? chat.messages.find((message) => message.messageId === item.replyToMessageId)
              : null;
            return (
              <>
              {showDate ? <Text style={styles.dateSeparator}>{formatMessageDate(item)}</Text> : null}
              <Pressable
                onLongPress={() => openMessageActions(item)}
                onPress={() => {
                  if (item.localState === 'failed') chat.retryMessage(item.messageId);
                }}
                style={[styles.messageRow, isMine ? styles.mineRow : styles.peerRow]}
              >
                <View style={[
                  styles.bubble,
                  isMine ? styles.mineBubble : styles.peerBubble,
                  item.messageType === 'encouragement' && styles.encouragementBubble,
                ]}>
                  {repliedMessage ? (
                    <View style={styles.replyQuote}>
                      <Text numberOfLines={1} style={styles.replyQuoteText}>
                        {repliedMessage.recalledAt ? '已撤回的消息' : repliedMessage.content}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[styles.messageText, isMine && styles.mineMessageText]}>
                    {item.recalledAt ? '撤回了一条消息' : item.content}
                  </Text>
                  <Text style={[styles.messageMeta, isMine && styles.mineMessageMeta]}>
                    {formatMessageTime(item.serverCreatedAt ?? item.clientCreatedAt)}
                    {isMine && !item.recalledAt ? ` · ${getMessageState(item)}` : ''}
                  </Text>
                </View>
              </Pressable>
              </>
            );
          }}
        />

        {replyMessage ? (
          <View style={styles.replyBar}>
            <Reply color={colors.purple} size={17} />
            <Text numberOfLines={1} style={styles.replyBarText}>
              回复：{replyMessage.content ?? '已撤回的消息'}
            </Text>
            <Pressable onPress={() => setReplyToMessageId(null)}>
              <Text style={styles.cancelReply}>取消</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            maxLength={2_000}
            multiline
            onChangeText={setDraft}
            placeholder="想对对方说点什么…"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
            value={draft}
          />
          <Pressable
            disabled={!draft.trim()}
            onPress={submit}
            style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
          >
            <Send color={colors.white} size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  keyboardRoot: { flex: 1 },
  header: {
    minHeight: 66, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center',
    borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
  },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 42 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  subtitle: { marginTop: 2, color: colors.inkMuted, fontSize: 10 },
  messageList: { paddingHorizontal: 14, paddingVertical: 18, gap: 9 },
  loadOlder: { paddingVertical: 8, alignItems: 'center' },
  loadOlderText: { color: colors.purple, fontSize: 12, fontWeight: '800' },
  dateSeparator: { paddingVertical: 7, color: colors.inkMuted, fontSize: 10, textAlign: 'center' },
  messageRow: { width: '100%', flexDirection: 'row' },
  mineRow: { justifyContent: 'flex-end' },
  peerRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 15 },
  mineBubble: { backgroundColor: colors.purple, borderBottomRightRadius: 4 },
  peerBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  encouragementBubble: { borderColor: colors.coral, borderWidth: 1 },
  replyQuote: { marginBottom: 6, paddingLeft: 8, borderLeftColor: colors.yellow, borderLeftWidth: 3 },
  replyQuoteText: { color: colors.inkMuted, fontSize: 11 },
  messageText: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  mineMessageText: { color: colors.white },
  messageMeta: { marginTop: 5, color: colors.inkMuted, fontSize: 9, textAlign: 'right' },
  mineMessageMeta: { color: 'rgba(255,255,255,0.72)' },
  replyBar: {
    minHeight: 40, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: colors.surface,
  },
  replyBarText: { flex: 1, color: colors.inkMuted, fontSize: 12 },
  cancelReply: { color: colors.coral, fontSize: 12, fontWeight: '800' },
  composer: {
    paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 9,
    borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: colors.surface,
  },
  input: {
    minHeight: 42, maxHeight: 112, flex: 1, paddingHorizontal: 13, paddingVertical: 10,
    color: colors.ink, borderRadius: 18, backgroundColor: colors.background, fontSize: 14,
  },
  sendButton: {
    width: 42, height: 42, alignItems: 'center', justifyContent: 'center',
    borderRadius: 21, backgroundColor: colors.coral,
  },
  sendButtonDisabled: { opacity: 0.4 },
});
