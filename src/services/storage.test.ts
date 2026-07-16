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

const activeSession = normalizeWorkoutSession({
  id: 'active-session',
  scheduledDate: '2026-07-14',
  kind: 'lower-a',
  source: 'scheduled',
  status: 'in_progress',
  startedAt: legacyStartedAt,
  currentExerciseIndex: 0,
  exerciseLogs: [
    {
      exerciseId: 'goblet-squat',
      sets: [
        {
          index: 0,
          weightKg: null,
          reps: 0,
          rir: 2,
          completed: false,
          pain: false,
        },
        {
          index: 1,
          weightKg: 8,
          reps: 0,
          rir: 2,
          completed: true,
          pain: false,
        },
      ],
    },
  ],
  templateVersion: 2,
});

assertEqual(activeSession?.exerciseLogs[0].sets[0].reps, 10, '旧活动训练的未完成组应补入要求次数');
assertEqual(activeSession?.exerciseLogs[0].sets[1].reps, 0, '已完成组的历史次数不得被迁移覆盖');
