import { getWorkoutTemplate } from '../data/workoutPlan';
import type {
  TodayWorkoutState,
  UserProfile,
  WorkoutKind,
  WorkoutSession,
} from '../types';

const prepLeadMinutes = 10;

const workoutKindByWeekday: Partial<Record<number, WorkoutKind>> = {
  1: 'upper-a',
  2: 'lower-a',
  4: 'upper-b',
  5: 'lower-b',
};

export interface WeekScheduleDay {
  date: Date;
  dateKey: string;
  weekday: number;
  kind: WorkoutKind | null;
}

export interface MonthCalendarDay extends WeekScheduleDay {
  isCurrentMonth: boolean;
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWorkoutKindForDate(date: Date): WorkoutKind | null {
  return workoutKindByWeekday[date.getDay()] ?? null;
}

export function getWeekSchedule(referenceDate = new Date()): WeekScheduleDay[] {
  const monday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const daysSinceMonday = (referenceDate.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      date,
      dateKey: getLocalDateKey(date),
      weekday: date.getDay(),
      kind: getWorkoutKindForDate(date),
    };
  });
}

export function getMonthCalendar(referenceDate = new Date()): MonthCalendarDay[] {
  const referenceYear = referenceDate.getFullYear();
  const referenceMonth = referenceDate.getMonth();
  const firstDayOfMonth = new Date(referenceYear, referenceMonth, 1, 12);
  const daysSinceMonday = (firstDayOfMonth.getDay() + 6) % 7;
  const calendarStartsAt = new Date(
    referenceYear,
    referenceMonth,
    1 - daysSinceMonday,
    12,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStartsAt);
    date.setDate(calendarStartsAt.getDate() + index);

    return {
      date,
      dateKey: getLocalDateKey(date),
      weekday: date.getDay(),
      kind: getWorkoutKindForDate(date),
      isCurrentMonth:
        date.getFullYear() === referenceYear && date.getMonth() === referenceMonth,
    };
  });
}

export function getWorkoutDurationSeconds(
  session: WorkoutSession,
  nowMs = Date.now(),
): number | null {
  const startedAtMs = Date.parse(session.startedAt);
  const endedAtMs =
    session.status === 'in_progress'
      ? nowMs
      : session.completedAt
        ? Date.parse(session.completedAt)
        : Number.NaN;

  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) {
    return null;
  }

  return Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1_000));
}

function normalizeDurationSeconds(seconds: number): number {
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
}

export function formatWorkoutDurationClock(seconds: number): string {
  const totalSeconds = normalizeDurationSeconds(seconds);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const minuteAndSecondParts = [minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, '0'));

  return hours === 0
    ? minuteAndSecondParts.join(':')
    : [String(hours).padStart(2, '0'), ...minuteAndSecondParts].join(':');
}

export function formatWorkoutDurationCompact(seconds: number): string {
  const totalSeconds = normalizeDurationSeconds(seconds);
  const totalMinutes = Math.floor(totalSeconds / 60);

  if (totalMinutes === 0) {
    return totalSeconds === 0 ? '0 分钟' : '不足 1 分钟';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} 分钟`;
  }

  return minutes === 0 ? `${hours} 小时` : `${hours} 小时 ${minutes} 分钟`;
}

export function getCompletedWorkoutDateKeys(sessions: WorkoutSession[]): Set<string> {
  const completedDateKeys = new Set<string>();

  for (const session of sessions) {
    if (session.status !== 'completed') {
      continue;
    }

    const startedAtMs = Date.parse(session.startedAt);
    if (Number.isFinite(startedAtMs)) {
      completedDateKeys.add(getLocalDateKey(new Date(startedAtMs)));
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(session.scheduledDate)) {
      completedDateKeys.add(session.scheduledDate);
    }
  }

  return completedDateKeys;
}

function findLatestSession(
  sessions: WorkoutSession[],
  predicate: (session: WorkoutSession) => boolean,
): WorkoutSession | null {
  let latestSession: WorkoutSession | null = null;
  let latestStartedAt = Number.NEGATIVE_INFINITY;

  for (const session of sessions) {
    if (!predicate(session)) {
      continue;
    }

    const startedAt = Date.parse(session.startedAt);
    const sortableStartedAt = Number.isNaN(startedAt) ? 0 : startedAt;
    if (!latestSession || sortableStartedAt >= latestStartedAt) {
      latestSession = session;
      latestStartedAt = sortableStartedAt;
    }
  }

  return latestSession;
}

function getValidWorkoutTime(profile: UserProfile): [number, number] {
  const hasValidHour =
    Number.isInteger(profile.workoutHour) &&
    profile.workoutHour >= 0 &&
    profile.workoutHour <= 23;
  const hasValidMinute =
    Number.isInteger(profile.workoutMinute) &&
    profile.workoutMinute >= 0 &&
    profile.workoutMinute <= 59;

  return [
    hasValidHour ? profile.workoutHour : 19,
    hasValidMinute ? profile.workoutMinute : 30,
  ];
}

function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// [Function] 解析当前训练卡片。[Warning] 任意日期的进行中训练始终优先。
export function getTodayWorkoutState(
  now: Date,
  sessions: WorkoutSession[],
  profile: UserProfile,
): TodayWorkoutState {
  const activeSession = findLatestSession(
    sessions,
    (session) => session.status === 'in_progress',
  );

  if (activeSession) {
    const template = getWorkoutTemplate(activeSession.kind, activeSession.templateVersion ?? 1);
    return {
      phase: 'active',
      template,
      session: activeSession,
      title: `${template.shortTitle}进行中`,
      detail: '继续完成本次训练，并记录每一组的重量和次数。',
    };
  }

  const todayDateKey = getLocalDateKey(now);
  const finishedSession = findLatestSession(
    sessions,
    (session) =>
      session.scheduledDate === todayDateKey &&
      (session.status === 'completed' || session.status === 'skipped'),
  );

  if (finishedSession) {
    const template = getWorkoutTemplate(finishedSession.kind, finishedSession.templateVersion ?? 1);
    const isCompleted = finishedSession.status === 'completed';
    return {
      phase: isCompleted ? 'completed' : 'skipped',
      template,
      session: finishedSession,
      title: isCompleted ? '今天训练完成' : '今天训练已跳过',
      detail: isCompleted
        ? `${template.shortTitle}已记录，记得补充蛋白质和水分。`
        : '保持原有周计划，后续训练不会自动顺延。',
    };
  }

  const workoutKind = getWorkoutKindForDate(now);
  if (!workoutKind) {
    return {
      phase: 'rest',
      template: null,
      session: null,
      title: '今天是休息日',
      detail: '恢复也属于计划，继续记录饮水和蛋白质。',
    };
  }

  const template = getWorkoutTemplate(workoutKind);
  const [workoutHour, workoutMinute] = getValidWorkoutTime(profile);
  const workoutStartsAt = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    workoutHour,
    workoutMinute,
  );
  const prepStartsAt = new Date(
    workoutStartsAt.getTime() - prepLeadMinutes * 60 * 1000,
  );
  const clockLabel = formatClock(workoutHour, workoutMinute);

  if (now < prepStartsAt) {
    return {
      phase: 'upcoming',
      template,
      session: null,
      title: `今晚 ${clockLabel} · ${template.shortTitle}`,
      detail: '按时吃饭和补水，到点后开始记录训练。',
    };
  }

  if (now < workoutStartsAt) {
    return {
      phase: 'prep',
      template,
      session: null,
      title: `${template.shortTitle} · 10 分钟后开始`,
      detail: '清出防滑空间，准备好哑铃、臂力棒、稳固椅和饮用水。',
    };
  }

  return {
    phase: 'due',
    template,
    session: null,
    title: `现在开始 · ${template.shortTitle}`,
    detail: '从热身开始，使用动作稳定且能保留余力的重量。',
  };
}
