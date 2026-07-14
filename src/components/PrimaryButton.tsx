import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors } from '../theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  tone?: 'dark' | 'coral' | 'teal' | 'light';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const toneColors = {
  dark: { background: colors.ink, foreground: colors.white },
  coral: { background: colors.coral, foreground: colors.white },
  teal: { background: colors.teal, foreground: colors.white },
  light: { background: colors.surface, foreground: colors.ink },
};

export function PrimaryButton({
  label,
  onPress,
  icon: Icon,
  tone = 'dark',
  disabled = false,
  loading = false,
  style,
  testID,
}: PrimaryButtonProps) {
  const palette = toneColors[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.background },
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : (
        <>
          {Icon ? <Icon color={palette.foreground} size={19} strokeWidth={2.4} /> : null}
          <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.42,
  },
});
