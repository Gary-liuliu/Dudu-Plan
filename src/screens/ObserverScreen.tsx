import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronRight as OpenDetails,
  CircleAlert,
  Clock3,
  LogOut,
  TimerReset,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '../components/IconButton';
import { ProgressBar } from '../components/ProgressBar';
import { getWorkoutTemplate } from '../data/workoutPlan';
import {
  formatWorkoutDurationClock,
  formatWorkoutDurationCompact,
  getCompletedWorkoutDateKeys,
  getLocalDateKey,
  getMonthCalendar,
  getWorkoutDurationSeconds,
} from '../domain/dateTime';
import { colors } from '../theme';
import type {
  ExerciseLog,
  ExerciseTemplate,
  WorkoutSession,
  WorkoutTemplate,
} from '../types';

export interface ObserverScreenProps {
  sessions: WorkoutSession[];
  connectionState: 'connecting' | 'online' | 'offline';
  lastSyncedAt: string | null;
  onLogout: () => void;
}

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

function getTimestampValue(timestamp?: string): number {
  const value = timestamp ? Date.parse(timestamp) : Number.NaN;
  return Number.isFinite(value) ? value : 0;
}

function getSessionTemplate(session: WorkoutSession): WorkoutTemplate {
  return getWorkoutTemplate(session.kind, session.templateVersion ?? 1);
}

function getSessionSetSummary(session: WorkoutSession): { completed: number; total: number } {
  const setLogs = session.exerciseLogs.flatMap((exerciseLog) => exerciseLog.sets);
  return {
    completed: setLogs.filter((setLog) => setLog.completed).length,
    total: setLogs.length,
  };
}

function getExerciseTemplate(
  template: WorkoutTemplate,
  exerciseLog: ExerciseLog,
  exerciseIndex: number,
): ExerciseTemplate | undefined {
  return template.exercises.find((exercise) => exercise.id === exerciseLog.exerciseId)
    ?? template.exercises[exerciseIndex];
}

function getSessionDateKey(session: WorkoutSession): string | null {
  const startedAt = new Date(session.startedAt);
  if (!Number.isNaN(startedAt.getTime())) {
    return getLocalDateKey(startedAt);
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(session.scheduledDate)
    ? session.scheduledDate
    : null;
}

function formatDate(dateKey: string | null): string {
  const dateParts = dateKey ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey) : null;
  return dateParts
    ? `${Number(dateParts[2])}月${Number(dateParts[3])}日`
    : '日期未知';
}

function formatTime(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '--:--';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatSyncLabel(timestamp: string | null): string {
  if (!timestamp) {
    return '尚未同步';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '同步时间未知';
  }

  const timeLabel = formatTime(timestamp);
  return getLocalDateKey(date) === getLocalDateKey()
    ? `更新于 ${timeLabel}`
    : `更新于 ${date.getMonth() + 1}月${date.getDate()}日 ${timeLabel}`;
}

function formatCountdown(seconds: number): string {
  const normalizedSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(normalizedSeconds / 60);
  const remainingSeconds = normalizedSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getCurrentExercise(
  session: WorkoutSession,
  template: WorkoutTemplate,
): { name: string; setNumber: number } {
  const maximumIndex = Math.max(0, session.exerciseLogs.length - 1);
  const currentIndex = Number.isInteger(session.currentExerciseIndex)
    ? Math.max(0, Math.min(session.currentExerciseIndex, maximumIndex))
    : 0;
  const exerciseLog = session.exerciseLogs[currentIndex];
  const exerciseTemplate = exerciseLog
    ? getExerciseTemplate(template, exerciseLog, currentIndex)
    : template.exercises[currentIndex];
  const nextSetIndex = exerciseLog?.sets.findIndex((setLog) => !setLog.completed) ?? -1;
  const setNumber = nextSetIndex >= 0
    ? nextSetIndex + 1
    : Math.max(1, exerciseLog?.sets.length ?? 1);

  return {
    name: exerciseTemplate?.name ?? `动作 ${currentIndex + 1}`,
    setNumber,
  };
}

function formatSetLoad(exercise: ExerciseTemplate | undefined, weightKg: number | null): string {
  if (exercise?.equipment === 'bodyweight') {
    return '自重';
  }

  return weightKg === null || !Number.isFinite(weightKg)
    ? '重量未记'
    : `${weightKg} kg`;
}

interface SessionDetailProps {
  session: WorkoutSession;
  nowMs: number;
  onClose: () => void;
}

// [Function] 展示只读训练详情。[Warning] 动作必须按会话保存的模板版本解析。
function SessionDetail({ session, nowMs, onClose }: SessionDetailProps) {
  const template = getSessionTemplate(session);
  const setSummary = getSessionSetSummary(session);
  const durationSeconds = getWorkoutDurationSeconds(session, nowMs) ?? 0;
  const currentExercise = getCurrentExercise(session, template);
  const restSeconds = session.restTimer
    ? Math.max(0, Math.ceil((session.restTimer.endAt - nowMs) / 1_000))
    : null;
  const progress = setSummary.total === 0 ? 0 : setSummary.completed / setSummary.total;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.detailScreen}>
      <View style={styles.detailHeader}>
        <View style={styles.detailHeading}>
          <Text style={styles.detailTitle}>{template.shortTitle}</Text>
          <Text style={styles.detailDate}>
            {formatDate(getSessionDateKey(session))} · {session.status === 'in_progress' ? '正在训练' : '已完成'}
          </Text>
        </View>
        <IconButton
          backgroundColor={colors.background}
          icon={X}
          label="关闭训练详情"
          onPress={onClose}
          size={40}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
        testID="observer-session-detail"
      >
        {session.status === 'in_progress' ? (
          <View style={[styles.nowBand, { borderLeftColor: template.accent }]}>
            <Text style={styles.nowLabel}>当前动作</Text>
            <Text style={styles.nowExercise}>{currentExercise.name}</Text>
            <Text style={styles.nowSet}>第 {currentExercise.setNumber} 组</Text>
          </View>
        ) : null}

        <View style={styles.detailMetrics}>
          <View style={styles.detailMetric}>
            <Text style={styles.metricLabel}>训练时长</Text>
            <Text style={styles.metricValue}>{formatWorkoutDurationClock(durationSeconds)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.detailMetric}>
            <Text style={styles.metricLabel}>完成组数</Text>
            <Text style={styles.metricValue}>{setSummary.completed}/{setSummary.total}</Text>
          </View>
          {restSeconds !== null && session.status === 'in_progress' ? (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.detailMetric}>
                <Text style={styles.metricLabel}>组间休息</Text>
                <Text style={[styles.metricValue, styles.restValue]}>
                  {formatCountdown(restSeconds)}
                </Text>
              </View>
            </>
          ) : null}
        </View>
        <ProgressBar color={template.accent} height={6} value={progress} />

        <View style={styles.exerciseList}>
          {session.exerciseLogs.length === 0 ? (
            <View style={styles.detailEmpty}>
              <Text style={styles.emptyText}>这次训练还没有组记录</Text>
            </View>
          ) : (
            session.exerciseLogs.map((exerciseLog, exerciseIndex) => {
              const exercise = getExerciseTemplate(template, exerciseLog, exerciseIndex);
              const isCurrent = session.status === 'in_progress'
                && exerciseIndex === session.currentExerciseIndex;

              return (
                <View key={`${exerciseLog.exerciseId}-${exerciseIndex}`} style={styles.exerciseSection}>
                  <View style={styles.exerciseHeader}>
                    <View
                      style={[
                        styles.exerciseNumber,
                        isCurrent && { backgroundColor: template.accent },
                      ]}
                    >
                      <Text style={[styles.exerciseNumberText, isCurrent && styles.exerciseNumberActive]}>
                        {exerciseIndex + 1}
                      </Text>
                    </View>
                    <View style={styles.exerciseCopy}>
                      <Text style={styles.exerciseName}>
                        {exercise?.name ?? `动作 ${exerciseIndex + 1}`}
                      </Text>
                      <Text style={styles.exerciseFocus}>{exercise?.focus ?? '训练动作'}</Text>
                    </View>
                  </View>

                  <View style={styles.setList}>
                    {exerciseLog.sets.map((setLog) => (
                      <View key={setLog.index} style={styles.setRow}>
                        <View style={styles.setIndex}>
                          {setLog.completed ? (
                            <Check color={colors.teal} size={16} strokeWidth={3} />
                          ) : (
                            <Text style={styles.setIndexText}>{setLog.index + 1}</Text>
                          )}
                        </View>
                        <View style={styles.setCopy}>
                          <Text style={styles.setMain}>
                            {formatSetLoad(exercise, setLog.weightKg)} · {setLog.reps} {exercise?.repUnit ?? '次'} · RIR {setLog.rir}
                          </Text>
                          <Text style={styles.setState}>
                            {setLog.completed ? '已完成' : '待完成'}
                          </Text>
                        </View>
                        {setLog.pain ? (
                          <View style={styles.painState}>
                            <CircleAlert color={colors.danger} size={15} strokeWidth={2.4} />
                            <Text style={styles.painText}>不适</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// [Function] 展示另一台手机同步的只读训练状态。[Warning] 训练时长与休息倒计时只由时间戳派生。
export function ObserverScreen({
  sessions,
  connectionState,
  lastSyncedAt,
  onLogout,
}: ObserverScreenProps) {
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12),
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const activeSession = useMemo(
    () => sessions
      .filter((session) => session.status === 'in_progress')
      .slice()
      .sort((left, right) => getTimestampValue(right.startedAt) - getTimestampValue(left.startedAt))[0]
      ?? null,
    [sessions],
  );
  const completedSessions = useMemo(
    () => sessions
      .filter((session) => session.status === 'completed')
      .slice()
      .sort((left, right) => (
        getTimestampValue(right.completedAt ?? right.startedAt)
        - getTimestampValue(left.completedAt ?? left.startedAt)
      )),
    [sessions],
  );
  const completedDateKeys = useMemo(
    () => getCompletedWorkoutDateKeys(sessions),
    [sessions],
  );
  const calendarDays = useMemo(
    () => getMonthCalendar(displayedMonth),
    [displayedMonth],
  );
  const selectedSession = selectedSessionId
    ? sessions.find((session) => session.id === selectedSessionId) ?? null
    : null;
  const lastSyncedAtMs = lastSyncedAt ? Date.parse(lastSyncedAt) : Number.NaN;
  const sessionClockMs = connectionState === 'offline' && Number.isFinite(lastSyncedAtMs)
    ? lastSyncedAtMs
    : nowMs;

  const connectionLabel = connectionState === 'online'
    ? '在线'
    : connectionState === 'connecting'
      ? '连接中'
      : '离线';
  const connectionColor = connectionState === 'online'
    ? colors.teal
    : connectionState === 'connecting'
      ? colors.yellow
      : colors.inkMuted;

  const changeMonth = (offset: number) => {
    setDisplayedMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12),
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="observer-screen"
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>嘟嘟的训练</Text>
            <View style={styles.connectionRow}>
              <View style={[styles.connectionDot, { backgroundColor: connectionColor }]} />
              <Text style={styles.connectionText}>{connectionLabel}</Text>
              <Text style={styles.syncText}>· {formatSyncLabel(lastSyncedAt)}</Text>
            </View>
          </View>
          <IconButton
            backgroundColor={colors.surface}
            icon={LogOut}
            label="退出账号"
            onPress={onLogout}
            size={42}
          />
        </View>

        <View style={styles.liveSection}>
          <Text style={styles.sectionEyebrow}>实时训练</Text>
          {activeSession ? (() => {
            const template = getSessionTemplate(activeSession);
            const setSummary = getSessionSetSummary(activeSession);
            const currentExercise = getCurrentExercise(activeSession, template);
            const durationSeconds = getWorkoutDurationSeconds(activeSession, sessionClockMs) ?? 0;
            const restSeconds = activeSession.restTimer
              ? Math.max(0, Math.ceil((activeSession.restTimer.endAt - sessionClockMs) / 1_000))
              : null;

            return (
              <Pressable
                accessibilityLabel={`查看正在进行的${template.shortTitle}`}
                accessibilityRole="button"
                onPress={() => setSelectedSessionId(activeSession.id)}
                style={({ pressed }) => [
                  styles.liveCard,
                  { borderLeftColor: template.accent },
                  pressed && styles.pressed,
                ]}
                testID="observer-active-session"
              >
                <View style={styles.liveHeader}>
                  <View style={styles.liveCopy}>
                    <Text style={styles.liveTitle}>{template.shortTitle}</Text>
                    <Text style={styles.liveExercise} numberOfLines={2}>
                      {currentExercise.name} · 第 {currentExercise.setNumber} 组
                    </Text>
                  </View>
                  <OpenDetails color={colors.inkMuted} size={20} strokeWidth={2.3} />
                </View>
                <View style={styles.liveStats}>
                  <View style={styles.inlineStat}>
                    <Clock3 color={colors.purple} size={16} strokeWidth={2.3} />
                    <Text style={styles.inlineStatText}>
                      {formatWorkoutDurationClock(durationSeconds)}
                    </Text>
                  </View>
                  <Text style={styles.liveSets}>{setSummary.completed}/{setSummary.total} 组</Text>
                  {restSeconds !== null ? (
                    <View style={styles.inlineStat}>
                      <TimerReset color={colors.coral} size={16} strokeWidth={2.3} />
                      <Text style={styles.inlineStatText}>{formatCountdown(restSeconds)}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })() : (
            <View style={styles.idleBand}>
              <Text style={styles.idleTitle}>现在没有训练</Text>
              <Text style={styles.idleText}>
                {connectionState === 'offline' ? '恢复连接后会继续同步' : '开始训练后会显示实时进度'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.calendarSection}>
          <View style={styles.monthHeader}>
            <IconButton
              backgroundColor={colors.background}
              icon={ChevronLeft}
              label="上个月"
              onPress={() => changeMonth(-1)}
              size={36}
            />
            <Text style={styles.monthTitle}>
              {displayedMonth.getFullYear()}年{displayedMonth.getMonth() + 1}月
            </Text>
            <IconButton
              backgroundColor={colors.background}
              icon={ChevronRight}
              label="下个月"
              onPress={() => changeMonth(1)}
              size={36}
            />
          </View>
          <View style={styles.weekdayRow}>
            {weekdayLabels.map((label) => (
              <Text key={label} style={styles.weekdayLabel}>{label}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((day) => {
              const isCompleted = day.isCurrentMonth && completedDateKeys.has(day.dateKey);
              const isToday = day.dateKey === getLocalDateKey();

              return (
                <View key={day.dateKey} style={styles.calendarDay}>
                  <View
                    accessibilityLabel={`${day.date.getMonth() + 1}月${day.date.getDate()}日${isCompleted ? '，已完成训练' : ''}`}
                    style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberToday,
                      isCompleted && styles.dayNumberCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !day.isCurrentMonth && styles.dayTextOutside,
                        isCompleted && styles.dayTextCompleted,
                      ]}
                    >
                      {day.date.getDate()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>最近训练</Text>
          {completedSessions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyText}>还没有同步到训练记录</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {completedSessions.slice(0, 10).map((session) => {
                const template = getSessionTemplate(session);
                const summary = getSessionSetSummary(session);
                const durationSeconds = getWorkoutDurationSeconds(session);

                return (
                  <Pressable
                    accessibilityLabel={`查看${formatDate(getSessionDateKey(session))}${template.shortTitle}`}
                    accessibilityRole="button"
                    key={session.id}
                    onPress={() => setSelectedSessionId(session.id)}
                    style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}
                  >
                    <View style={[styles.historyAccent, { backgroundColor: template.accent }]} />
                    <View style={styles.historyCopy}>
                      <Text style={styles.historyTitle}>{template.shortTitle}</Text>
                      <Text style={styles.historyDate}>
                        {formatDate(getSessionDateKey(session))} · {formatTime(session.startedAt)}-{formatTime(session.completedAt)}
                      </Text>
                    </View>
                    <View style={styles.historyStats}>
                      <Text style={styles.historyDuration}>
                        {durationSeconds === null ? '--' : formatWorkoutDurationCompact(durationSeconds)}
                      </Text>
                      <Text style={styles.historySets}>{summary.completed}/{summary.total} 组</Text>
                    </View>
                    <OpenDetails color={colors.inkMuted} size={17} strokeWidth={2.3} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedSessionId(null)}
        presentationStyle="fullScreen"
        visible={selectedSession !== null}
      >
        {selectedSession ? (
          <SessionDetail
            nowMs={sessionClockMs}
            onClose={() => setSelectedSessionId(null)}
            session={selectedSession}
          />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 620,
    paddingBottom: 38,
    alignSelf: 'center',
  },
  header: {
    minHeight: 84,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 31,
    letterSpacing: 0,
  },
  connectionRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  connectionDot: {
    width: 7,
    height: 7,
    marginRight: 6,
    borderRadius: 4,
  },
  connectionText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  syncText: {
    color: colors.inkMuted,
    fontSize: 11,
    letterSpacing: 0,
  },
  liveSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionEyebrow: {
    marginBottom: 9,
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  liveCard: {
    minHeight: 128,
    padding: 16,
    borderColor: colors.line,
    borderLeftWidth: 5,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  liveCopy: {
    flex: 1,
  },
  liveTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  liveExercise: {
    marginTop: 6,
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    letterSpacing: 0,
  },
  liveStats: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  inlineStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inlineStatText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  liveSets: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  idleBand: {
    minHeight: 80,
    paddingVertical: 15,
    borderBottomColor: colors.line,
    borderTopColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  idleTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  idleText: {
    marginTop: 5,
    color: colors.inkMuted,
    fontSize: 12,
    letterSpacing: 0,
  },
  calendarSection: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  monthHeader: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  weekdayRow: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekdayLabel: {
    width: '14.2857%',
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.2857%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'transparent',
    borderWidth: 1,
    borderRadius: 8,
  },
  dayNumberToday: {
    borderColor: colors.coral,
  },
  dayNumberCompleted: {
    backgroundColor: colors.purple,
  },
  dayText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  dayTextOutside: {
    color: colors.line,
  },
  dayTextCompleted: {
    color: colors.white,
  },
  historySection: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  historyList: {
    marginTop: 8,
  },
  historyRow: {
    minHeight: 72,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyAccent: {
    width: 4,
    height: 42,
    borderRadius: 2,
  },
  historyCopy: {
    minWidth: 0,
    flex: 1,
  },
  historyTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  historyDate: {
    marginTop: 4,
    color: colors.inkMuted,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0,
  },
  historyStats: {
    maxWidth: 82,
    alignItems: 'flex-end',
  },
  historyDuration: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
    letterSpacing: 0,
  },
  historySets: {
    marginTop: 4,
    color: colors.inkMuted,
    fontSize: 10,
    letterSpacing: 0,
  },
  emptyHistory: {
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyText: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.68,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailHeader: {
    minHeight: 72,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
  },
  detailHeading: {
    minWidth: 0,
    flex: 1,
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0,
  },
  detailDate: {
    marginTop: 4,
    color: colors.inkMuted,
    fontSize: 11,
    letterSpacing: 0,
  },
  detailContent: {
    width: '100%',
    maxWidth: 620,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 38,
    alignSelf: 'center',
  },
  nowBand: {
    paddingVertical: 12,
    paddingLeft: 13,
    borderLeftWidth: 4,
  },
  nowLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  nowExercise: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    letterSpacing: 0,
  },
  nowSet: {
    marginTop: 3,
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  detailMetrics: {
    minHeight: 80,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailMetric: {
    minWidth: 0,
    flex: 1,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    marginHorizontal: 10,
    backgroundColor: colors.line,
  },
  metricLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  metricValue: {
    marginTop: 5,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  restValue: {
    color: colors.coralDark,
  },
  exerciseList: {
    paddingTop: 24,
  },
  exerciseSection: {
    paddingVertical: 18,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseNumber: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  exerciseNumberText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  exerciseNumberActive: {
    color: colors.white,
  },
  exerciseCopy: {
    minWidth: 0,
    flex: 1,
  },
  exerciseName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    letterSpacing: 0,
  },
  exerciseFocus: {
    marginTop: 3,
    color: colors.inkMuted,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0,
  },
  setList: {
    marginTop: 10,
    marginLeft: 44,
  },
  setRow: {
    minHeight: 50,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  setIndex: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  setIndexText: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  setCopy: {
    minWidth: 0,
    flex: 1,
  },
  setMain: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    letterSpacing: 0,
  },
  setState: {
    marginTop: 2,
    color: colors.inkMuted,
    fontSize: 10,
    letterSpacing: 0,
  },
  painState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  painText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
  detailEmpty: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
