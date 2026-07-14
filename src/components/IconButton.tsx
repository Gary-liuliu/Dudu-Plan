import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '../theme';

interface IconButtonProps {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  size?: number;
  testID?: string;
}

export function IconButton({
  label,
  icon: Icon,
  onPress,
  color = colors.ink,
  backgroundColor = colors.surface,
  disabled = false,
  size = 44,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, height: size, width: size },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon color={color} size={Math.round(size * 0.47)} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.35,
  },
});
