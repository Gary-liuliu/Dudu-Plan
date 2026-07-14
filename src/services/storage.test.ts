import { normalizeWorkoutSession } from './storage';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const legacyStartedAt = '2026-07-13T12:00:00.000Z';
const legacySession = normalizeWorkoutSession({
  id: 'legacy-session',
  scheduledDate: '2026-07-13',
  kind: 'lower-b',
  source: 'scheduled',
  status: 'in_progress',
  startedAt: legacyStartedAt,
  currentExerciseIndex: 4,
  exerciseLogs: [],
});

assertEqual(legacySession?.templateVersion, 1, '旧会话缺少版本时必须迁移为 v1');
assertEqual(legacySession?.updatedAt, legacyStartedAt, '旧会话缺少更新时间时应回退到开始时间');

const currentUpdatedAt = '2026-07-14T12:05:00.000Z';
const currentSession = normalizeWorkoutSession({
  ...legacySession,
  id: 'current-session',
  templateVersion: 2,
  updatedAt: currentUpdatedAt,
});

assertEqual(currentSession?.templateVersion, 2, 'v2 会话版本不得被迁移覆盖');
assertEqual(currentSession?.updatedAt, currentUpdatedAt, '已有更新时间不得被迁移覆盖');
