import { Minus, Plus } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { IconButton } from './IconButton';

interface NumericStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  precision?: number;
  disabled?: boolean;
}

export function NumericStepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  suffix = '',
  precision = 0,
  disabled = false,
}: NumericStepperProps) {
  const changeBy = (delta: number) => {
    const nextValue = Math.min(max, Math.max(min, value + delta));
    onChange(Number(nextValue.toFixed(precision)));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text>
      <View style={styles.controls}>
        <IconButton
          label={`减少${label}`}
          icon={Minus}
          onPress={() => changeBy(-step)}
          backgroundColor={colors.background}
          disabled={disabled}
          size={38}
        />
        <Text style={[styles.value, disabled && styles.disabledText]} numberOfLines={1}>
          {value.toFixed(precision)}{suffix}
        </Text>
        <IconButton
          label={`增加${label}`}
          icon={Plus}
          onPress={() => changeBy(step)}
          backgroundColor={colors.background}
          disabled={disabled}
          size={38}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 132,
    flex: 1,
  },
  label: {
    marginBottom: 6,
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  controls: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  value: {
    minWidth: 46,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
  },
  disabledText: {
    color: colors.inkMuted,
  },
});
