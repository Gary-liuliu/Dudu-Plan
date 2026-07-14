import {
  BellRing,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Radio,
  Settings2,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { IconButton } from '../components/IconButton';
import { NumericStepper } from '../components/NumericStepper';
import { ScreenHeader } from '../components/ScreenHeader';
import { getWorkoutTemplate } from '../data/workoutPlan';
import {
  formatWorkoutDurationCompact,
  getCompletedWorkoutDateKeys,
  getLocalDateKey,
  getMonthCalendar,
  getWorkoutDurationSeconds,
} from '../domain/dateTime';
import { useAppStore } from '../state/AppStore';
import { colors } from '../theme';
import { useAccountStore } from '../state/AccountStore';
import { useRealtimeStore } from '../state/RealtimeStore';
import type { WorkoutSession } from '../types';

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];

function getSessionSetSummary(session: WorkoutSession): { completed: number; total: number } {
  const allSets = session.exerciseLogs.flatMap((exercise) => exercise.sets);
  return {
    completed: allSets.filter((setLog) => setLog.completed).length,
    total: allSets.length,
  };
}

function formatHistoryDate(dateKey: string): string {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!dateParts) {
    return dateKey;
  }

  return `${Number(dateParts[2])}月${Number(dateParts[3])}日`;
}

function formatTimestampTime(timestamp?: string): string {
  if (!timestamp) {
    return '--:--';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatClockMinutes(totalMinutes: number): string {
  const normalizedMinutes = ((Math.round(totalMinutes) % 1_440) + 1_440) % 1_440;
  const hour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getSessionLocalDateKey(session: WorkoutSession): string | null {
  const startedAt = new Date(session.startedAt);
  return Number.isNaN(startedAt.getTime()) ? null : getLocalDateKey(startedAt);
}

function sortCompletedSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions
    .filter((session) => session.status === 'completed')
    .slice()
    .sort((left, right) => {
      const leftTime = Date.parse(left.completedAt ?? left.startedAt);
      const rightTime = Date.parse(right.completedAt ?? right.startedAt);
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    });
}

// [Function] 展示完成训练的月历与历史。[Warning] 日期统一归属到 startedAt 对应的本地自然日。
export function ProgressScreen() {
  const { data, updateProfile } = useAppStore();
  const { logout, session } = useAccountStore();
  const { observerConnected } = useRealtimeStore();
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12),
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const todayDateKey = getLocalDateKey();
  const calendarDays = useMemo(() => getMonthCalendar(displayedMonth), [displayedMonth]);
  const completedSessions = useMemo(
    () => sortCompletedSessions(data.sessions),
    [data.sessions],
  );
  const completedDateKeys = useMemo(
    () => getCompletedWorkoutDateKeys(data.sessions),
    [data.sessions],
  );
  const displayedMonthKey = getMonthKey(displayedMonth);
  const monthlySessions = useMemo(
    () => completedSessions.filter(
      (session) => getSessionLocalDateKey(session)?.startsWith(displayedMonthKey),
    ),
    [completedSessions, displayedMonthKey],
  );
  const monthlyDurationSeconds = monthlySessions.reduce(
    (total, session) => total + (getWorkoutDurationSeconds(session) ?? 0),
    0,
  );
  const visibleSessions = selectedDateKey
    ? completedSessions.filter((session) => getSessionLocalDateKey(session) === selectedDateKey)
    : completedSessions.slice(0, 8);
  const workoutStartMinutes = data.profile.workoutHour * 60 + data.profile.workoutMinute;

  const changeMonth = (offset: number) => {
    setDisplayedMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12),
    );
    setSelectedDateKey(null);
  };

  const selectCompletedDate = (dateKey: string) => {
    setSelectedDateKey((current) => current === dateKey ? null : dateKey);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="progress-screen"
      >
        <ScreenHeader
          action={{
            label: '打开设置',
            icon: Settings2,
            onPress: () => setShowSettings(true),
          }}
          title="训练记录"
        />

        <View style={styles.calendarSection}>
          <View style={styles.monthHeader}>
            <IconButton
              backgroundColor={colors.background}
              icon={ChevronLeft}
              label="上个月"
              onPress={() => changeMonth(-1)}
              size={38}
            />
            <Text style={styles.monthTitle}>
              {displayedMonth.getFullYear()}年{displayedMonth.getMonth() + 1}月
            </Text>
            <IconButton
              backgroundColor={colors.background}
              icon={ChevronRight}
              label="下个月"
              onPress={() => changeMonth(1)}
              size={38}
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
              const isSelected = selectedDateKey === day.dateKey;
              const isToday = todayDateKey === day.dateKey;

              return (
                <Pressable
                  accessibilityLabel={`${day.date.getMonth() + 1}月${day.date.getDate()}日${isCompleted ? '，已完成训练' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !isCompleted, selected: isSelected }}
                  disabled={!isCompleted}
                  key={day.dateKey}
                  onPress={() => selectCompletedDate(day.dateKey)}
                  style={({ pressed }) => [
                    styles.calendarDay,
                    isSelected && styles.calendarDaySelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
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
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.monthSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>本月训练</Text>
            <Text style={styles.summaryValue}>{monthlySessions.length}<Text style={styles.summaryUnit}> 次</Text></Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>总时长</Text>
            <Text style={styles.summaryValueSmall}>
              {formatWorkoutDurationCompact(monthlyDurationSeconds)}
            </Text>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            {selectedDateKey ? `${formatHistoryDate(selectedDateKey)}训练` : '最近训练'}
          </Text>

          {visibleSessions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>完成训练后会显示在这里</Text>
            </View>
          ) : (
            <View style={styles.sessionHistory}>
              {visibleSessions.map((session) => {
                const template = getWorkoutTemplate(session.kind, session.templateVersion ?? 1);
                const setSummary = getSessionSetSummary(session);
                const durationSeconds = getWorkoutDurationSeconds(session);
                const sessionDateKey = getSessionLocalDateKey(session);

                return (
                  <View key={session.id} style={styles.sessionRow}>
                    <View style={[styles.sessionAccent, { backgroundColor: template.accent }]} />
                    <View style={styles.sessionMain}>
                      <Text style={styles.sessionTitle}>{template.shortTitle}</Text>
                      <Text style={styles.sessionDate}>
                        {sessionDateKey ? formatHistoryDate(sessionDateKey) : '日期未知'} · {formatTimestampTime(session.startedAt)}-{formatTimestampTime(session.completedAt)}
                      </Text>
                    </View>
                    <View style={styles.sessionStats}>
                      <Text style={styles.sessionDuration}>
                        {durationSeconds === null ? '--' : formatWorkoutDurationCompact(durationSeconds)}
                      </Text>
                      <Text style={styles.sessionSets}>{setSummary.completed}/{setSummary.total} 组</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
        transparent
        visible={showSettings}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>设置</Text>
              <IconButton
                backgroundColor={colors.background}
                icon={X}
                label="关闭设置"
                onPress={() => setShowSettings(false)}
                size={38}
              />
            </View>

            <ScrollView contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
              <View style={styles.settingsField}>
                <NumericStepper
                  label="蛋白质目标"
                  max={250}
                  min={60}
                  onChange={(proteinTargetG) => updateProfile({ proteinTargetG })}
                  step={5}
                  suffix="g"
                  value={data.profile.proteinTargetG}
                />
              </View>
              <View style={styles.settingsField}>
                <NumericStepper
                  label="饮水目标"
                  max={5000}
                  min={1000}
                  onChange={(waterTargetMl) => updateProfile({ waterTargetMl })}
                  step={250}
                  suffix="ml"
                  value={data.profile.waterTargetMl}
                />
              </View>
              <View style={styles.settingsField}>
                <NumericStepper
                  label="哑铃最小档位"
                  max={10}
                  min={0.25}
                  onChange={(weightStepKg) => updateProfile({ weightStepKg })}
                  precision={data.profile.weightStepKg < 1 ? 2 : 1}
                  step={0.25}
                  suffix="kg"
                  value={data.profile.weightStepKg}
                />
              </View>

              <View style={styles.reminderRow}>
                <View style={styles.reminderIcon}>
                  <BellRing color={colors.purple} size={21} strokeWidth={2.3} />
                </View>
                <View style={styles.reminderCopy}>
                  <Text style={styles.reminderTitle}>训练提醒</Text>
                  <Text style={styles.reminderText}>
                    训练日 {formatClockMinutes(workoutStartMinutes - 10)} 准备，{formatClockMinutes(workoutStartMinutes)} 开始
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="训练提醒"
                  onValueChange={(reminderEnabled) => updateProfile({ reminderEnabled })}
                  thumbColor={colors.white}
                  trackColor={{ false: colors.line, true: colors.purple }}
                  value={data.profile.reminderEnabled}
                />
              </View>

              <View style={styles.accountRow}>
                <View style={styles.accountIcon}>
                  <Radio color={observerConnected ? colors.teal : colors.inkMuted} size={21} strokeWidth={2.3} />
                </View>
                <View style={styles.reminderCopy}>
                  <Text style={styles.reminderTitle}>{session?.accountName ?? '嘟嘟'}</Text>
                  <Text style={styles.reminderText}>
                    {observerConnected ? '肚肚已连接' : '肚肚未连接'}
                  </Text>
                </View>
                <IconButton
                  backgroundColor={colors.background}
                  icon={LogOut}
                  label="退出账号"
                  onPress={() => {
                    void logout().catch(() => {
                      Alert.alert('退出失败', '无法清除本机登录状态，请稍后重试。');
                    });
                  }}
                  size={38}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: 34,
  },
  calendarSection: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  monthHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  weekdayRow: {
    height: 30,
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
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  calendarDaySelected: {
    backgroundColor: colors.softPurple,
  },
  dayNumber: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderColor: 'transparent',
    borderWidth: 1,
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
  monthSummary: {
    minHeight: 92,
    marginTop: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderTopColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 42,
    marginHorizontal: 20,
    backgroundColor: colors.line,
  },
  summaryLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  summaryValue: {
    marginTop: 5,
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  summaryValueSmall: {
    marginTop: 7,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  summaryUnit: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  historySection: {
    paddingHorizontal: 20,
    paddingTop: 26,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sessionHistory: {
    marginTop: 8,
  },
  sessionRow: {
    minHeight: 68,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionAccent: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  sessionMain: {
    flex: 1,
  },
  sessionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sessionDate: {
    marginTop: 4,
    color: colors.inkMuted,
    fontSize: 11,
    letterSpacing: 0,
  },
  sessionStats: {
    alignItems: 'flex-end',
  },
  sessionDuration: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  sessionSets: {
    marginTop: 4,
    color: colors.inkMuted,
    fontSize: 11,
    letterSpacing: 0,
  },
  emptyHistory: {
    minHeight: 82,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emptyHistoryText: {
    color: colors.inkMuted,
    fontSize: 12,
    letterSpacing: 0,
  },
  modalBackdrop: {
    flex: 1,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,16,20,0.55)',
  },
  modalPanel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '86%',
    padding: 20,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  settingsContent: {
    paddingTop: 8,
  },
  settingsField: {
    paddingVertical: 11,
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reminderRow: {
    minHeight: 70,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountRow: {
    minHeight: 70,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accountIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  reminderIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.softPurple,
  },
  reminderCopy: {
    flex: 1,
  },
  reminderTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  reminderText: {
    marginTop: 3,
    color: colors.inkMuted,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
