import {
  formatWorkoutDurationClock,
  formatWorkoutDurationCompact,
  getCompletedWorkoutDateKeys,
  getLocalDateKey,
  getMonthCalendar,
  getTodayWorkoutState,
  getWeekSchedule,
  getWorkoutKindForDate,
  getWorkoutDurationSeconds,
} from './dateTime';
import { getWorkoutTemplate } from '../data/workoutPlan';
import type { UserProfile, WorkoutSession } from '../types';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const profile: UserProfile = {
  heightCm: 178,
  weightKg: 70,
  proteinTargetG: 130,
  waterTargetMl: 2500,
  workoutHour: 19,
  workoutMinute: 30,
  weightStepKg: 1,
  reminderEnabled: true,
  birthSex: 'unspecified',
  age: null,
  waistCm: null,
  neckCm: null,
  hipCm: null,
};

function createSession(
  status: WorkoutSession['status'],
  scheduledDate: string,
  startedAt: string,
  completedAt?: string,
  source: WorkoutSession['source'] = 'scheduled',
): WorkoutSession {
  return {
    id: `${status}-${scheduledDate}`,
    scheduledDate,
    kind: 'upper-a',
    source,
    status,
    startedAt,
    updatedAt: completedAt ?? startedAt,
    ...(completedAt ? { completedAt } : {}),
    currentExerciseIndex: 0,
    exerciseLogs: [],
    templateVersion: 1,
  };
}

const monday = new Date(2026, 6, 13, 8, 5);
assertEqual(getLocalDateKey(monday), '2026-07-13', '本地日期键应补齐月日');
assertEqual(getWorkoutKindForDate(monday), 'upper-a', '周一应为上肢 A');
assertEqual(
  getWorkoutKindForDate(new Date(2026, 6, 14)),
  'lower-a',
  '周二应为下肢 A',
);
assertEqual(
  getWorkoutKindForDate(new Date(2026, 6, 15)),
  null,
  '周三应为休息日',
);
assertEqual(
  getWorkoutKindForDate(new Date(2026, 6, 16)),
  'upper-b',
  '周四应为上肢 B',
);
assertEqual(
  getWorkoutKindForDate(new Date(2026, 6, 17)),
  'lower-b',
  '周五应为下肢 B',
);
assertEqual(
  getWorkoutKindForDate(new Date(2026, 6, 18)),
  null,
  '周六应为休息日',
);

const weekSchedule = getWeekSchedule(new Date(2026, 6, 16));
assertEqual(weekSchedule[0].dateKey, '2026-07-13', '周视图应从周一开始');
assertEqual(weekSchedule[6].dateKey, '2026-07-19', '周视图应包含完整七天');

const julyCalendar = getMonthCalendar(new Date(2026, 6, 14));
assertEqual(julyCalendar.length, 42, '月历应固定为六周');
assertEqual(julyCalendar[0].dateKey, '2026-06-29', '月历应从包含月初的周一开始');
assertEqual(julyCalendar[41].dateKey, '2026-08-09', '月历应填满连续四十二天');
assertEqual(julyCalendar[0].isCurrentMonth, false, '上月补位日期应标记为非本月');
assertEqual(julyCalendar[2].isCurrentMonth, true, '本月日期应正确标记');
assertEqual(
  new Set(julyCalendar.map((day) => day.dateKey)).size,
  42,
  '月历日期不应重复',
);

const leapYearCalendar = getMonthCalendar(new Date(2028, 1, 15));
assertEqual(
  leapYearCalendar.some((day) => day.dateKey === '2028-02-29' && day.isCurrentMonth),
  true,
  '闰年二月应包含二十九日',
);

const decemberCalendar = getMonthCalendar(new Date(2026, 11, 15));
assertEqual(decemberCalendar[0].dateKey, '2026-11-30', '跨年月份仍应从周一开始');
assertEqual(decemberCalendar[41].dateKey, '2027-01-10', '跨年月份应包含次年补位日期');

const activeDurationSession = createSession(
  'in_progress',
  '2026-07-14',
  '2026-07-14T11:30:00.000Z',
);
assertEqual(
  getWorkoutDurationSeconds(activeDurationSession, Date.parse('2026-07-14T12:25:42.000Z')),
  3342,
  '进行中训练应使用当前时间计算秒数',
);

const completedDurationSession = createSession(
  'completed',
  '2026-07-14',
  '2026-07-14T11:30:00.000Z',
  '2026-07-14T12:30:00.000Z',
);
assertEqual(
  getWorkoutDurationSeconds(completedDurationSession, Date.parse('2026-07-15T12:30:00.000Z')),
  3600,
  '已完成训练应固定使用结束时间',
);

const overnightDurationSession = createSession(
  'completed',
  '2026-07-14',
  '2026-07-14T23:30:00.000Z',
  '2026-07-15T01:15:00.000Z',
);
assertEqual(
  getWorkoutDurationSeconds(overnightDurationSession),
  6300,
  '跨午夜训练应保留完整时长',
);

const longDurationSession = createSession(
  'completed',
  '2026-07-14',
  '2026-07-14T00:00:00.000Z',
  '2026-07-15T03:05:06.000Z',
);
assertEqual(getWorkoutDurationSeconds(longDurationSession), 97506, '超过一天的训练不应截断');
assertEqual(formatWorkoutDurationClock(97506), '27:05:06', '时钟小时数不应按二十四小时回绕');
assertEqual(formatWorkoutDurationClock(3342), '55:42', '不足一小时应只显示分秒');
assertEqual(formatWorkoutDurationClock(Number.NaN), '00:00', '无效秒数应安全归零');
assertEqual(formatWorkoutDurationCompact(0), '0 分钟', '零时长应明确显示');
assertEqual(formatWorkoutDurationCompact(42), '不足 1 分钟', '不足一分钟应避免显示为零');
assertEqual(formatWorkoutDurationCompact(3342), '55 分钟', '紧凑时长应省略秒数');
assertEqual(formatWorkoutDurationCompact(3600), '1 小时', '整小时不应显示零分钟');
assertEqual(formatWorkoutDurationCompact(3900), '1 小时 5 分钟', '小时与分钟应组合显示');
assertEqual(formatWorkoutDurationCompact(-30), '0 分钟', '负秒数应安全归零');

const futureStartedSession = createSession(
  'in_progress',
  '2026-07-14',
  '2026-07-14T12:30:00.000Z',
);
assertEqual(
  getWorkoutDurationSeconds(futureStartedSession, Date.parse('2026-07-14T11:30:00.000Z')),
  0,
  '设备时间回拨时不应产生负时长',
);
assertEqual(
  getWorkoutDurationSeconds(createSession('in_progress', '2026-07-14', 'invalid'), 0),
  null,
  '无效开始时间应返回空值',
);
assertEqual(
  getWorkoutDurationSeconds(createSession('completed', '2026-07-14', '2026-07-14T11:30:00.000Z')),
  null,
  '旧完成记录缺少结束时间时应返回空值',
);
assertEqual(
  getWorkoutDurationSeconds(activeDurationSession, Number.NaN),
  null,
  '无效当前时间应返回空值',
);

const completedWorkoutDateKeys = getCompletedWorkoutDateKeys([
  createSession(
    'completed',
    '2026-07-13',
    new Date(2026, 6, 14, 19, 30).toISOString(),
    new Date(2026, 6, 14, 20, 30).toISOString(),
  ),
  createSession(
    'completed',
    '2026-07-13',
    new Date(2026, 6, 14, 23, 30).toISOString(),
    new Date(2026, 6, 15, 1, 15).toISOString(),
  ),
  createSession(
    'completed',
    '2026-07-18',
    new Date(2026, 6, 18, 19, 30).toISOString(),
    new Date(2026, 6, 18, 20, 30).toISOString(),
    'makeup',
  ),
  createSession('skipped', '2026-07-16', '2026-07-16T11:30:00.000Z'),
  createSession('in_progress', '2026-07-17', '2026-07-17T11:30:00.000Z'),
  createSession('completed', 'not-a-date', 'invalid'),
]);
assertEqual(completedWorkoutDateKeys.size, 2, '完成日期应去重并忽略无效或未完成记录');
assertEqual(completedWorkoutDateKeys.has('2026-07-14'), true, '训练应标记实际开始日期');
assertEqual(completedWorkoutDateKeys.has('2026-07-15'), false, '跨午夜训练只标记开始日期');
assertEqual(completedWorkoutDateKeys.has('2026-07-18'), true, '休息日补练也应标记');
assertEqual(completedWorkoutDateKeys.has('2026-07-16'), false, '跳过训练不应标记');

assertEqual(
  getTodayWorkoutState(new Date(2026, 6, 13, 19, 19, 59), [], profile).phase,
  'upcoming',
  '19:20 前应显示稍后训练',
);
assertEqual(
  getTodayWorkoutState(new Date(2026, 6, 13, 19, 20), [], profile).phase,
  'prep',
  '19:20 应进入准备阶段',
);
assertEqual(
  getTodayWorkoutState(new Date(2026, 6, 13, 19, 29, 59), [], profile).phase,
  'prep',
  '19:30 前应保持准备阶段',
);
assertEqual(
  getTodayWorkoutState(new Date(2026, 6, 13, 19, 30), [], profile).phase,
  'due',
  '19:30 应进入到点阶段',
);

const completedToday = createSession(
  'completed',
  '2026-07-13',
  '2026-07-13T11:30:00.000Z',
);
assertEqual(
  getTodayWorkoutState(new Date(2026, 6, 13, 20), [completedToday], profile).phase,
  'completed',
  '今日完成记录应优先于时间阶段',
);

const activeFromYesterday = createSession(
  'in_progress',
  '2026-07-12',
  '2026-07-12T15:50:00.000Z',
);
assertEqual(
  getTodayWorkoutState(
    new Date(2026, 6, 13, 20),
    [completedToday, activeFromYesterday],
    profile,
  ).phase,
  'active',
  '跨日进行中的训练应拥有最高优先级',
);

const activeV2Session = { ...activeFromYesterday, id: 'active-v2', templateVersion: 2 };
assertEqual(
  getTodayWorkoutState(new Date(2026, 6, 13, 20), [activeV2Session], profile).template,
  getWorkoutTemplate('upper-a', 2),
  '旧版进行中训练必须继续使用自身模板版本',
);

const completedV2Session = { ...completedToday, id: 'completed-v2', templateVersion: 2 };
assertEqual(
  getTodayWorkoutState(new Date(2026, 6, 13, 20), [completedV2Session], profile).template,
  getWorkoutTemplate('upper-a', 2),
  '旧版完成记录必须继续使用自身模板版本',
);

assertEqual(
  getTodayWorkoutState(new Date(2026, 6, 15, 12), [], profile).phase,
  'rest',
  '休息日应显示恢复状态',
);
