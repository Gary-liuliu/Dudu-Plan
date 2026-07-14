import * as Haptics from 'expo-haptics';
import { Clock3, FastForward, Plus } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import type { RestTimerState } from '../types';

interface RestTimerBannerProps {
  timer: RestTimerState;
  nowMs: number;
  onAddTime: () => void;
  onSkip: () => void;
}

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RestTimerBanner({ timer, nowMs, onAddTime, onSkip }: RestTimerBannerProps) {
  const remainingSeconds = Math.max(0, Math.ceil((timer.endAt - nowMs) / 1000));
  const announcedTimerRef = useRef<string | null>(null);
  const timerKey = `${timer.exerciseId}-${timer.setIndex}-${timer.endAt}`;

  useEffect(() => {
    if (remainingSeconds === 0 && announcedTimerRef.current !== timerKey) {
      announcedTimerRef.current = timerKey;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [remainingSeconds, timerKey]);

  return (
    <View style={[styles.container, remainingSeconds === 0 && styles.finished]} testID="rest-timer">
      <View style={styles.clockBox}>
        <Clock3 color={remainingSeconds === 0 ? colors.teal : colors.purple} size={21} strokeWidth={2.4} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{remainingSeconds === 0 ? '休息结束' : '组间休息'}</Text>
        <Text style={styles.time}>{formatRemaining(remainingSeconds)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="休息增加30秒"
        onPress={onAddTime}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Plus color={colors.ink} size={16} strokeWidth={2.7} />
        <Text style={styles.actionText}>30秒</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="结束休息"
        onPress={onSkip}
        style={({ pressed }) => [styles.skipAction, pressed && styles.pressed]}
      >
        <FastForward color={colors.white} size={18} strokeWidth={2.6} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 76,
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftColor: colors.purple,
    borderLeftWidth: 5,
    backgroundColor: colors.softPurple,
  },
  finished: {
    borderLeftColor: colors.teal,
    backgroundColor: colors.softTeal,
  },
  clockBox: {
    height: 42,
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  time: {
    marginTop: 1,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
  },
  action: {
    minHeight: 40,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  actionText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  skipAction: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
});
