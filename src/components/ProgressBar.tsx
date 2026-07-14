import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

interface ProgressBarProps {
  value: number;
  color: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({
  value,
  color,
  trackColor = colors.line,
  height = 8,
}: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(value, 1)) * 100}%` as const;

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height }]}>
      <View style={[styles.fill, { backgroundColor: color, width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
