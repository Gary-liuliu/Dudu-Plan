import {
  createOwnerSnapshotMessages,
  getRealtimePresenceState,
  getRealtimeMessageByteLength,
  initialRealtimeDiagnosticsState,
  initializeOwnerSyncMetadata,
  markNotificationEventHandled,
  maximumRealtimeMessageBytes,
  reduceRealtimeDiagnostics,
  resolveRealtimeDisconnectReason,
  shouldForceRefreshRealtimeToken,
  shouldSendOwnerSnapshot,
  shouldReconnectRealtimeSocket,
} from './realtime';
import { getPendingWorkoutPushEvents } from '../domain/sync';
import type { OwnerSyncMetadata } from './ownerSyncStorage';
import type { WorkoutSession } from '../types';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function createSession(id: string): WorkoutSession {
  const timestamp = '2026-07-14T12:00:00.000Z';
  return {
    id,
    scheduledDate: '2026-07-14',
    kind: 'lower-a',
    source: 'scheduled',
    status: 'completed',
    startedAt: timestamp,
    updatedAt: timestamp,
    completedAt: timestamp,
    currentExerciseIndex: 0,
    exerciseLogs: [],
    templateVersion: 2,
  };
}

const emptySnapshotMessages = createOwnerSnapshotMessages([]);
assertEqual(emptySnapshotMessages.length, 1, '空快照也必须发送一次');
assertEqual(
  (JSON.parse(emptySnapshotMessages[0]) as { sessions: unknown[] }).sessions.length,
  0,
  '空快照不得伪造训练记录',
);

const batchedSnapshotMessages = createOwnerSnapshotMessages(
  Array.from({ length: 17 }, (_, index) => createSession(`session-${index}`)),
);
assertEqual(batchedSnapshotMessages.length, 3, '17 条训练记录应按 8/8/1 分批');
assertEqual(
  (JSON.parse(batchedSnapshotMessages[0]) as { sessions: unknown[] }).sessions.length,
  8,
  '首批快照应包含 8 条记录',
);
assertEqual(
  batchedSnapshotMessages.every(
    (message) => getRealtimeMessageByteLength(message) <= maximumRealtimeMessageBytes,
  ),
  true,
  '所有快照消息都必须小于等于 64KiB',
);

const sizeLimitedMessages = createOwnerSnapshotMessages(
  [createSession('中'.repeat(160)), createSession('文'.repeat(160))],
  { maximumBytes: 1_200, maximumSessions: 8 },
);
assertEqual(sizeLimitedMessages.length, 2, '超过字节预算时应提前拆分快照');
assertEqual(
  sizeLimitedMessages.every((message) => getRealtimeMessageByteLength(message) <= 1_200),
  true,
  '自定义字节预算也必须被遵守',
);

let oversizedSessionRejected = false;
try {
  createOwnerSnapshotMessages([createSession('x'.repeat(2_000))], { maximumBytes: 500 });
} catch {
  oversizedSessionRejected = true;
}
assertEqual(oversizedSessionRejected, true, '无法拆分的单条超大记录不得发送');

const metadata: OwnerSyncMetadata = {
  version: 1,
  syncStartedAt: '2026-07-14T12:00:05.000Z',
  includedSessionIds: ['existing-active'],
  handledNotificationEventIds: ['session-1:workout_started'],
};
const initializedMetadata = initializeOwnerSyncMetadata(
  metadata,
  '2026-07-14T12:00:00.000Z',
  ['existing-active', 'new-active'],
);
assertEqual(
  initializedMetadata.syncStartedAt,
  '2026-07-14T12:00:00.000Z',
  '初始化期间开始的训练必须落在同步时间范围内',
);
assertEqual(initializedMetadata.includedSessionIds.length, 2, '活动训练 ID 应合并且去重');
const handledOnce = markNotificationEventHandled(metadata, 'session-2:workout_completed');
const handledTwice = markNotificationEventHandled(handledOnce, 'session-2:workout_completed');
assertEqual(handledTwice.handledNotificationEventIds.length, 2, '通知事件 ID 必须幂等去重');
assertEqual(handledTwice, handledOnce, '重复确认不得创建新的元数据版本');

const ownerPresence = getRealtimePresenceState('owner', true, true);
assertEqual(ownerPresence.peerConnected, true, '嘟嘟应识别肚肚在线');
assertEqual(ownerPresence.observerConnected, true, '嘟嘟应看到肚肚在线');
const observerPresence = getRealtimePresenceState('observer', false, true);
assertEqual(observerPresence.peerConnected, false, '肚肚应单独记录嘟嘟是否在线');
assertEqual(observerPresence.observerConnected, false, '肚肚界面不应声明另一个观察端在线');

assertEqual(
  shouldSendOwnerSnapshot(false, true, false),
  true,
  '肚肚从离线变在线时必须发送快照，不能只依赖服务端请求标记',
);
assertEqual(
  shouldSendOwnerSnapshot(true, true, false),
  false,
  '重复 presence 不应无条件重复发送快照',
);
assertEqual(
  shouldSendOwnerSnapshot(true, true, true),
  true,
  '服务端明确请求快照时必须响应',
);

assertEqual(shouldReconnectRealtimeSocket(1_006), true, '普通断网应自动重连');
assertEqual(shouldReconnectRealtimeSocket(4_001), false, '同角色被新连接替换后不得抢回连接');
assertEqual(shouldReconnectRealtimeSocket(4_004), false, '角色不匹配必须重新登录而不是循环重连');
assertEqual(shouldForceRefreshRealtimeToken(4_003), true, '认证失败重连前必须强制刷新 Access Token');
assertEqual(shouldForceRefreshRealtimeToken(1_006), false, '普通断网不得无条件刷新 Access Token');

assertEqual(
  resolveRealtimeDisconnectReason('', 'connection_timeout'),
  'connection_timeout',
  '本地断线原因必须补充空白的 WebSocket 关闭原因',
);
assertEqual(
  resolveRealtimeDisconnectReason('authentication_failed', 'websocket_error'),
  'authentication_failed',
  '服务端关闭原因必须优先于本地兜底原因',
);
const disconnectedDiagnostics = reduceRealtimeDiagnostics(initialRealtimeDiagnosticsState, {
  type: 'disconnect',
  code: 4_003,
  reason: 'authentication_failed',
  occurredAt: 123,
});
assertEqual(disconnectedDiagnostics.lastDisconnect?.code, 4_003, '断线码必须保留');
assertEqual(disconnectedDiagnostics.lastDisconnect?.occurredAt, 123, '断线时间必须保留');
const reconnectedOnceDiagnostics = reduceRealtimeDiagnostics(disconnectedDiagnostics, {
  type: 'reconnect_scheduled',
});
const reconnectedTwiceDiagnostics = reduceRealtimeDiagnostics(reconnectedOnceDiagnostics, {
  type: 'reconnect_scheduled',
});
assertEqual(reconnectedTwiceDiagnostics.reconnectCount, 2, '每次真正安排重连必须累计一次');
const resetDiagnostics = reduceRealtimeDiagnostics(reconnectedTwiceDiagnostics, {
  type: 'session_reset',
});
assertEqual(
  resetDiagnostics.reconnectCount,
  0,
  '退出或切换角色后必须清空重连次数',
);
assertEqual(resetDiagnostics.lastDisconnect, null, '新登录不得继承上一账号的断线原因');

const oldCompletedSessions = Array.from({ length: 101 }, (_, index) => ({
  ...createSession(`old-${index}`),
  startedAt: `2026-07-${String(index % 10 + 1).padStart(2, '0')}T10:00:00.000Z`,
  updatedAt: `2026-07-${String(index % 10 + 1).padStart(2, '0')}T11:00:00.000Z`,
  completedAt: `2026-07-${String(index % 10 + 1).padStart(2, '0')}T11:00:00.000Z`,
}));
const allOldEventIds = oldCompletedSessions.flatMap((session) => [
  `${session.id}:workout_started`,
  `${session.id}:workout_completed`,
]);
const truncatedHistoryMetadata: OwnerSyncMetadata = {
  ...metadata,
  syncStartedAt: '2026-07-01T00:00:00.000Z',
  handledNotificationEventIds: allOldEventIds.slice(-200),
};
const reappearingExpiredEvents = getPendingWorkoutPushEvents(
  oldCompletedSessions,
  truncatedHistoryMetadata,
  Date.parse('2026-07-14T12:00:00.000Z'),
);
assertEqual(reappearingExpiredEvents.length, 2, '截断后会重新发现最早一条训练的两个旧事件');
assertEqual(
  reappearingExpiredEvents.filter(({ expired }) => !expired).length,
  0,
  '被淘汰的过期事件不得再次发送',
);
