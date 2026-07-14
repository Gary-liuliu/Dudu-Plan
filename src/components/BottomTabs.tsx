import {
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  House,
  Utensils,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme';
import type { AppTab } from '../types';

interface BottomTabsProps {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}

const tabs: Array<{ key: AppTab; label: string; icon: LucideIcon }> = [
  { key: 'home', label: '今天', icon: House },
  { key: 'workout', label: '训练', icon: Dumbbell },
  { key: 'nutrition', label: '饮食', icon: Utensils },
  { key: 'progress', label: '记录', icon: ChartNoAxesColumnIncreasing },
];

export function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            testID={`tab-${tab.key}`}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
              <Icon
                color={isActive ? colors.white : colors.inkMuted}
                fill={isActive && tab.key === 'home' ? colors.white : 'none'}
                size={21}
                strokeWidth={2.3}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 70,
    paddingTop: 7,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
  },
  tab: {
    minHeight: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconBox: {
    height: 30,
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconBoxActive: {
    backgroundColor: colors.ink,
  },
  label: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
  },
  labelActive: {
    color: colors.ink,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.65,
  },
});
