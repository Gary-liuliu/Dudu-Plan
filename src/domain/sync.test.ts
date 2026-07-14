import { getPendingWorkoutPushEvents, getSyncEligibleSessions, mergeWorkoutSessions } from './sync';
import type { OwnerSyncMetadata } from '../services/ownerSyncStorage';
import type { WorkoutSession } from '../types';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function createSession(
  id: string,
  startedAt: string,
  updatedAt = startedAt,
  status: WorkoutSession['status'] = 'completed',
): WorkoutSession {
  return {
    id,
    scheduledDate: startedAt.slice(0, 10),
    kind: 'lower-b',
    source: 'scheduled',
    status,
    startedAt,
    updatedAt,
    ...(status === 'completed' ? { completedAt: updatedAt } : {}),
    currentExerciseIndex: 0,
    exerciseLogs: [],
    templateVersion: 2,
  };
}

const metadata: OwnerSyncMetadata = {
  version: 1,
  syncStartedAt: '2026-07-14T12:00:00.000Z',
  includedSessionIds: ['legacy-active'],
  observerPushToken: 'ExponentPushToken[test]',
  handledNotificationEventIds: [],
};

const oldSession = createSession('old', '2026-07-13T12:00:00.000Z');
const legacyActiveSession = createSession(
  'legacy-active',
  '2026-07-13T13:00:00.000Z',
  '2026-07-14T12:10:00.000Z',
  'in_progress',
);
const futureSession = createSession(
  'future',
  '2026-07-14T12:01:00.000Z',
  '2026-07-14T12:50:00.000Z',
);

const eligibleSessions = getSyncEligibleSessions(
  [oldSession, legacyActiveSession, futureSession],
  metadata,
);
assertEqual(eligibleSessions.length, 2, '只应同步启用后的会话与升级时活动会话');
assertEqual(eligibleSessions.some((session) => session.id === 'old'), false, '旧历史不应同步');
assertEqual(eligibleSessions.some((session) => session.id === 'legacy-active'), true, '升级时活动会话应保留');

const staleFutureSession = { ...futureSession, updatedAt: '2026-07-14T12:20:00.000Z' };
const newerFutureSession = { ...futureSession, updatedAt: '2026-07-14T12:55:00.000Z' };
assertEqual(
  mergeWorkoutSessions([futureSession], [staleFutureSession])[0].updatedAt,
  futureSession.updatedAt,
  '较旧更新不得覆盖缓存',
);
assertEqual(
  mergeWorkoutSessions([futureSession], [newerFutureSession])[0].updatedAt,
  newerFutureSession.updatedAt,
  '较新更新应覆盖缓存',
);

const pendingEvents = getPendingWorkoutPushEvents(
  [futureSession],
  metadata,
  Date.parse('2026-07-14T13:00:00.000Z'),
);
assertEqual(pendingEvents.length, 2, '完成训练应生成开始和结束两个事件');
assertEqual(pendingEvents[0].expired, true, '超过三十分钟的开始通知应过期');
assertEqual(pendingEvents[1].expired, false, '三十分钟内的完成通知应保留');

const handledMetadata = {
  ...metadata,
  handledNotificationEventIds: pendingEvents.map(({ event }) => event.id),
};
assertEqual(
  getPendingWorkoutPushEvents([futureSession], handledMetadata).length,
  0,
  '已处理通知不得重复生成',
);
