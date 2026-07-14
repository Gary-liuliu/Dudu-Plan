import {
  ChevronDown,
  ChevronUp,
  Droplets,
  Plus,
  Undo2,
  Utensils,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '../components/IconButton';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAppStore } from '../state/AppStore';
import { colors } from '../theme';

const proteinPresets = [20, 25, 30, 35];
const waterPresets = [250, 500];

export function NutritionScreen() {
  const {
    data,
    todayNutrition,
    addProtein,
    addWater,
    undoProtein,
    undoWater,
  } = useAppStore();
  const [showTakeoutTips, setShowTakeoutTips] = useState(false);
  const waterTotal = useMemo(
    () => todayNutrition.waterEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [todayNutrition.waterEntries],
  );
  const proteinTotal = useMemo(
    () => todayNutrition.proteinEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [todayNutrition.proteinEntries],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      testID="nutrition-screen"
    >
      <ScreenHeader title="饮食记录" />

      <View style={styles.trackers}>
        <View style={[styles.tracker, styles.proteinTracker]}>
          <View style={styles.trackerHeading}>
            <View style={styles.trackerNameRow}>
              <View style={styles.iconBox}>
                <Utensils color={colors.coralDark} size={21} strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.trackerName}>蛋白质</Text>
                <Text style={styles.trackerValue}>
                  {proteinTotal}
                  <Text style={styles.trackerTarget}> / {data.profile.proteinTargetG}g</Text>
                </Text>
              </View>
            </View>
            <IconButton
              label="撤销上一条蛋白质记录"
              icon={Undo2}
              onPress={() => undoProtein()}
              backgroundColor="rgba(255,255,255,0.72)"
              color={colors.coralDark}
              disabled={todayNutrition.proteinEntries.length === 0}
              size={38}
            />
          </View>
          <ProgressBar
            color={colors.coral}
            trackColor="rgba(255,255,255,0.78)"
            value={proteinTotal / data.profile.proteinTargetG}
          />
          <View style={styles.quickActions}>
            {proteinPresets.map((grams) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`记录${grams}克蛋白质`}
                key={grams}
                onPress={() => addProtein(grams, '快速记录')}
                style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}
              >
                <Plus color={colors.coralDark} size={15} strokeWidth={2.8} />
                <Text style={[styles.quickButtonText, styles.proteinQuickText]}>{grams}g</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.tracker, styles.waterTracker]}>
          <View style={styles.trackerHeading}>
            <View style={styles.trackerNameRow}>
              <View style={styles.iconBox}>
                <Droplets color={colors.blue} size={22} strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.trackerName}>饮水</Text>
                <Text style={styles.trackerValue}>
                  {waterTotal}
                  <Text style={styles.trackerTarget}> / {data.profile.waterTargetMl}ml</Text>
                </Text>
              </View>
            </View>
            <IconButton
              label="撤销上一条饮水记录"
              icon={Undo2}
              onPress={() => undoWater()}
              backgroundColor="rgba(255,255,255,0.72)"
              color={colors.blue}
              disabled={todayNutrition.waterEntries.length === 0}
              size={38}
            />
          </View>
          <ProgressBar
            color={colors.blue}
            trackColor="rgba(255,255,255,0.78)"
            value={waterTotal / data.profile.waterTargetMl}
          />
          <View style={styles.quickActions}>
            {waterPresets.map((milliliters) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`记录${milliliters}毫升饮水`}
                key={milliliters}
                onPress={() => addWater(milliliters, '快速记录')}
                style={({ pressed }) => [styles.quickButton, styles.waterQuickButton, pressed && styles.pressed]}
              >
                <Plus color={colors.blue} size={15} strokeWidth={2.8} />
                <Text style={[styles.quickButtonText, styles.waterQuickText]}>{milliliters}ml</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.takeoutSection}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showTakeoutTips ? '收起外卖建议' : '展开外卖建议'}
          accessibilityState={{ expanded: showTakeoutTips }}
          onPress={() => setShowTakeoutTips((visible) => !visible)}
          style={({ pressed }) => [styles.takeoutToggle, pressed && styles.pressed]}
        >
          <View style={styles.takeoutTitleRow}>
            <Utensils color={colors.teal} size={19} strokeWidth={2.3} />
            <Text style={styles.takeoutTitle}>外卖怎么点</Text>
          </View>
          {showTakeoutTips ? (
            <ChevronUp color={colors.inkMuted} size={19} strokeWidth={2.3} />
          ) : (
            <ChevronDown color={colors.inkMuted} size={19} strokeWidth={2.3} />
          )}
        </Pressable>
        {showTakeoutTips ? (
          <Text style={styles.takeoutText}>
            一份瘦肉或海鲜 + 一份绿叶菜 + 一份米饭。优先白切鸡去皮、卤牛肉、清蒸鱼和虾仁滑蛋，备注少油少酱。
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 30,
  },
  trackers: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tracker: {
    padding: 15,
    borderRadius: 8,
  },
  proteinTracker: {
    backgroundColor: colors.softCoral,
  },
  waterTracker: {
    backgroundColor: colors.softBlue,
  },
  trackerHeading: {
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  iconBox: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  trackerName: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  trackerValue: {
    marginTop: 1,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  trackerTarget: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  quickActions: {
    marginTop: 13,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    minHeight: 38,
    minWidth: 67,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  waterQuickButton: {
    minWidth: 102,
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  proteinQuickText: {
    color: colors.coralDark,
  },
  waterQuickText: {
    color: colors.blue,
  },
  takeoutSection: {
    marginHorizontal: 20,
    marginTop: 22,
    borderTopColor: colors.line,
    borderTopWidth: 1,
  },
  takeoutToggle: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  takeoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  takeoutTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  takeoutText: {
    paddingBottom: 16,
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.72,
  },
});
