import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, Check, ChevronRight, Dumbbell, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import {
  getCompletedWorkoutDateKeys,
  getLocalDateKey,
  getTodayWorkoutState,
  getWeekSchedule,
} from '../domain/dateTime';
import { useAppStore } from '../state/AppStore';
import { colors } from '../theme';
import type { AppTab } from '../types';

interface HomeScreenProps {
  onNavigate: (tab: AppTab) => void;
}

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { data, activeSession, startWorkout } = useAppStore();
  const [now, setNow] = useState(() => new Date());
  const todayState = useMemo(
    () => getTodayWorkoutState(now, data.sessions, data.profile),
    [data.profile, data.sessions, now],
  );
  const weekSchedule = useMemo(() => getWeekSchedule(now), [now]);
  const completedDateKeys = useMemo(
    () => getCompletedWorkoutDateKeys(data.sessions),
    [data.sessions],
  );
  const activeDateKeys = useMemo(
    () => new Set(
      data.sessions
        .filter((session) => session.status === 'in_progress')
        .map((session) => new Date(session.startedAt))
        .filter((startedAt) => !Number.isNaN(startedAt.getTime()))
        .map((startedAt) => getLocalDateKey(startedAt)),
    ),
    [data.sessions],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const openWorkout = () => {
    if (!activeSession && todayState.template && !['completed', 'skipped'].includes(todayState.phase)) {
      startWorkout(todayState.template.kind, todayState.session?.scheduledDate ?? getLocalDateKey(now));
    }
    onNavigate(todayState.phase === 'completed' ? 'progress' : 'workout');
  };

  const primaryLabel = activeSession
    ? '继续训练'
    : todayState.phase === 'completed'
      ? '查看今日记录'
      : todayState.phase === 'skipped'
        ? '查看训练计划'
        : todayState.template
          ? '开始今天训练'
          : '查看训练计划';

  const todayDateKey = getLocalDateKey(now);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="home-screen"
    >
      <LinearGradient
        colors={[colors.coral, '#FF8B4D', colors.yellow]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.hero}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Dumbbell color={colors.white} size={22} strokeWidth={2.5} />
          </View>
          <View>
            <Text style={styles.brand}>嘟嘟计划</Text>
            <Text style={styles.dateText}>
              {now.getMonth() + 1}月{now.getDate()}日 · 周{weekdayLabels[now.getDay()]}
            </Text>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <View style={styles.heroEyebrowRow}>
            {todayState.phase === 'completed' ? (
              <Check color={colors.white} size={17} strokeWidth={2.8} />
            ) : (
              <Sparkles color={colors.white} size={17} strokeWidth={2.4} />
            )}
            <Text style={styles.heroEyebrow}>现在该做什么</Text>
          </View>
          <Text style={styles.heroTitle}>{todayState.title}</Text>
          <Text style={styles.heroDetail}>{todayState.detail}</Text>
        </View>

        <PrimaryButton
          label={primaryLabel}
          icon={todayState.phase === 'completed' ? ChevronRight : Dumbbell}
          onPress={openWorkout}
          style={styles.heroButton}
          testID="home-primary-action"
          tone="light"
        />
      </LinearGradient>

      <View style={styles.weekSection}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>本周</Text>
          <CalendarDays color={colors.purple} size={21} strokeWidth={2.2} />
        </View>

        <View style={styles.weekRow}>
          {weekSchedule.map((day) => {
            const isCompleted = completedDateKeys.has(day.dateKey);
            const isInProgress = activeDateKeys.has(day.dateKey);
            const isToday = day.dateKey === todayDateKey;
            const plannedLabel = day.kind?.startsWith('upper') ? '上' : '下';

            return (
              <View key={day.dateKey} style={styles.dayItem}>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {weekdayLabels[day.weekday]}
                </Text>
                <View
                  accessibilityLabel={`${day.date.getMonth() + 1}月${day.date.getDate()}日，${
                    isCompleted
                      ? '训练已完成'
                      : isInProgress
                        ? '训练进行中'
                        : day.kind
                          ? `${plannedLabel}肢训练计划`
                          : '休息日'
                  }`}
                  style={[
                    styles.dayTile,
                    isCompleted && styles.completedDayTile,
                    isInProgress && !isCompleted && styles.activeDayTile,
                    isToday && styles.todayDayTile,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateNumber,
                      isCompleted && styles.completedDateNumber,
                      isInProgress && !isCompleted && styles.activeDateNumber,
                    ]}
                  >
                    {day.date.getDate()}
                  </Text>
                  {isCompleted ? (
                    <Check color={colors.white} size={14} strokeWidth={3} />
                  ) : isInProgress ? (
                    <View style={styles.activeDot} />
                  ) : (
                    <Text style={[styles.planLabel, !day.kind && styles.restLabel]}>
                      {day.kind ? plannedLabel : '休'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <Check color={colors.green} size={14} strokeWidth={3} />
            <Text style={styles.legendText}>已完成</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>进行中</Text>
          </View>
          <Text style={styles.legendText}>上 / 下 · 计划</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
  },
  hero: {
    minHeight: 292,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  brandRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(32,32,39,0.16)',
  },
  brand: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  dateText: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  heroCopy: {
    marginVertical: 20,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroEyebrow: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  heroTitle: {
    marginTop: 8,
    maxWidth: 340,
    color: colors.white,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 37,
    letterSpacing: 0,
  },
  heroDetail: {
    marginTop: 6,
    maxWidth: 340,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    letterSpacing: 0,
  },
  heroButton: {
    alignSelf: 'stretch',
  },
  weekSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0,
  },
  weekRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    width: 40,
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
  },
  dayLabelToday: {
    color: colors.ink,
    fontWeight: '900',
  },
  dayTile: {
    height: 52,
    width: 40,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  completedDayTile: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  activeDayTile: {
    borderColor: colors.purple,
    backgroundColor: colors.softPurple,
  },
  todayDayTile: {
    borderColor: colors.ink,
    borderWidth: 2,
  },
  dateNumber: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  completedDateNumber: {
    color: colors.white,
  },
  activeDateNumber: {
    color: colors.purple,
  },
  activeDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.purple,
  },
  planLabel: {
    color: colors.coralDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  restLabel: {
    color: colors.inkMuted,
  },
  legendRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: colors.purple,
  },
  legendText: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0,
  },
});
