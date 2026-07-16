import { mergeChatMessages } from './chatStorage';
import type { ChatMessage } from '../types';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function createMessage(messageId: string, id: number | null, content: string): ChatMessage {
  return {
    id,
    messageId,
    senderRole: 'owner',
    receiverRole: 'observer',
    messageType: 'text',
    content,
    replyToMessageId: null,
    clientCreatedAt: 100,
    serverCreatedAt: id === null ? null : 200,
    deliveredAt: null,
    readAt: null,
    recalledAt: null,
    ...(id === null ? { localState: 'sending' as const } : {}),
  };
}

const pending = createMessage('same-id', null, '你好');
const saved = createMessage('same-id', 8, '你好');
const merged = mergeChatMessages([pending], [saved]);
assertEqual(merged.length, 1, '服务端确认不得产生重复消息');
assertEqual(merged[0].id, 8, '服务端主键应替换本地发送中记录');
assertEqual(merged[0].localState, undefined, '服务端保存后应清除本地发送状态');

const recalled = { ...saved, content: null, recalledAt: 300 };
const recalledMerge = mergeChatMessages(merged, [recalled]);
assertEqual(recalledMerge[0].content, null, '撤回后缓存不得保留原正文');
assertEqual(recalledMerge[0].recalledAt, 300, '撤回时间应保存到缓存');
