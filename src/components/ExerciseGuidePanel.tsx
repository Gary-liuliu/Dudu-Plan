import { Image } from 'expo-image';
import {
  AlertTriangle,
  BookOpenCheck,
  CircleStop,
  House,
  ImageOff,
  Pause,
  Play,
  Repeat2,
  Target,
} from 'lucide-react-native';
import { memo, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ExerciseGuide } from '../data/exerciseGuides';
import { exerciseGuideSafetyNotice } from '../data/exerciseGuides';
import { exerciseMediaByKey } from '../data/exerciseMedia';
import { colors } from '../theme';

interface ExerciseGuideThumbnailProps {
  guide: ExerciseGuide;
  size?: number;
}

interface ExerciseGuidePanelProps {
  guide: ExerciseGuide;
  showMedia?: boolean;
  tip?: string;
  warning?: string;
  testID?: string;
}

interface ExerciseGuideMediaProps {
  guide: ExerciseGuide;
  showStepsHint?: boolean;
  testID?: string;
}

export const ExerciseGuideThumbnail = memo(function ExerciseGuideThumbnail({
  guide,
  size = 52,
}: ExerciseGuideThumbnailProps) {
  const media = guide.mediaKey ? exerciseMediaByKey[guide.mediaKey] : undefined;

  if (!media) {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.thumbnailFallback, { height: size, width: size }]}>
        <BookOpenCheck color={colors.blue} size={22} strokeWidth={2.1} />
      </View>
    );
  }

  return (
    <Image
      accessible={false}
      cachePolicy="memory-disk"
      contentFit="contain"
      source={media.image}
      style={[styles.thumbnail, { height: size, width: size }]}
    />
  );
});

function GuideSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// [Function] 展示动作媒体。[Warning] 近似媒体必须先展示姿势差异，不能默认播放。
export const ExerciseGuideMedia = memo(function ExerciseGuideMedia({
  guide,
  showStepsHint = false,
  testID,
}: ExerciseGuideMediaProps) {
  const media = guide.mediaKey ? exerciseMediaByKey[guide.mediaKey] : undefined;
  const [showAnimation, setShowAnimation] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotionEnabled) => {
      if (isMounted && !reduceMotionEnabled && guide.mediaMatch === 'exact') {
        setShowAnimation(true);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (reduceMotionEnabled) => {
        if (reduceMotionEnabled) {
          setShowAnimation(false);
        }
      },
    );
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [guide.mediaMatch]);

  return (
    <View testID={testID}>
      {media ? (
        <View style={styles.mediaCard}>
          {guide.mediaNote ? (
            <View style={styles.mediaNote}>
              <AlertTriangle color={colors.coralDark} size={17} strokeWidth={2.4} />
              <Text selectable style={styles.mediaNoteText}>{guide.mediaNote}</Text>
            </View>
          ) : null}
          {showAnimation ? (
            <Image
              accessibilityLabel={`${guide.name}动作示范动画`}
              accessible
              autoplay
              cachePolicy="memory-disk"
              contentFit="contain"
              onError={() => {
                setGifFailed(true);
                setShowAnimation(false);
              }}
              source={media.gif}
              style={styles.media}
              testID={`${testID ?? guide.id}-media`}
            />
          ) : imageFailed ? (
            <View accessibilityLabel={`${guide.name}静态图加载失败`} style={[styles.media, styles.mediaFailure]}>
              <ImageOff color={colors.inkMuted} size={29} strokeWidth={2} />
              <Text style={styles.mediaFailureText}>静态图加载失败</Text>
            </View>
          ) : (
            <Image
              accessibilityLabel={`${guide.name}静态动作图`}
              accessible
              cachePolicy="memory-disk"
              contentFit="contain"
              onError={() => setImageFailed(true)}
              source={media.image}
              style={styles.media}
              testID={`${testID ?? guide.id}-media`}
            />
          )}
          <View accessibilityRole="tablist" style={styles.mediaControls}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ disabled: gifFailed, selected: showAnimation }}
              disabled={gifFailed}
              onPress={() => setShowAnimation(true)}
              style={({ pressed }) => [
                styles.mediaControl,
                showAnimation && styles.mediaControlActive,
                gifFailed && styles.mediaControlDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Play color={showAnimation ? colors.white : colors.inkMuted} size={16} strokeWidth={2.4} />
              <Text style={[styles.mediaControlText, showAnimation && styles.mediaControlTextActive]}>
                {gifFailed ? '动图不可用' : '播放动图'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: !showAnimation }}
              onPress={() => setShowAnimation(false)}
              style={({ pressed }) => [
                styles.mediaControl,
                !showAnimation && styles.mediaControlActive,
                pressed && styles.pressed,
              ]}
            >
              <Pause color={!showAnimation ? colors.white : colors.inkMuted} size={16} strokeWidth={2.4} />
              <Text style={[styles.mediaControlText, !showAnimation && styles.mediaControlTextActive]}>查看静态图</Text>
            </Pressable>
          </View>
          <Text selectable style={styles.attribution}>© Gym visual — https://gymvisual.com/ · 180×180</Text>
        </View>
      ) : (
        <View style={styles.noMediaCard}>
          <ImageOff color={colors.inkMuted} size={25} strokeWidth={2} />
          <View style={styles.noMediaCopy}>
            <Text style={styles.noMediaTitle}>暂无匹配动画</Text>
            <Text selectable style={styles.noMediaText}>{guide.mediaUnavailableReason}</Text>
            {showStepsHint ? <Text style={styles.noMediaHint}>可展开下方“动作示范与步骤”查看做法</Text> : null}
          </View>
        </View>
      )}
    </View>
  );
});

// [Function] 展示当前模板版本的动作教程。[Warning] 可隐藏媒体以避免同一 GIF 重复挂载。
export const ExerciseGuidePanel = memo(function ExerciseGuidePanel({
  guide,
  showMedia = true,
  tip,
  warning,
  testID,
}: ExerciseGuidePanelProps) {
  return (
    <View style={styles.root} testID={testID}>
      {showMedia ? <ExerciseGuideMedia guide={guide} testID={`${testID ?? guide.id}-guide-media`} /> : null}

      <View style={styles.muscleRow}>
        {guide.primaryMuscles.map((muscle) => (
          <View key={`primary-${muscle}`} style={[styles.muscleChip, styles.primaryMuscleChip]}>
            <Text style={styles.primaryMuscleText}>主要 · {muscle}</Text>
          </View>
        ))}
        {guide.secondaryMuscles.map((muscle) => (
          <View key={`secondary-${muscle}`} style={styles.muscleChip}>
            <Text style={styles.muscleText}>辅助 · {muscle}</Text>
          </View>
        ))}
      </View>

      <GuideSection icon={<House color={colors.blue} size={18} strokeWidth={2.3} />} title="居家准备">
        <Text selectable style={styles.bodyText}>{guide.homeSetup}</Text>
      </GuideSection>

      {tip ? (
        <View style={styles.quickTip}>
          <Target color={colors.teal} size={18} strokeWidth={2.4} />
          <Text selectable style={styles.quickTipText}>{tip}</Text>
        </View>
      ) : null}

      <GuideSection icon={<BookOpenCheck color={colors.purple} size={18} strokeWidth={2.3} />} title="动作步骤">
        <View style={styles.list}>
          {guide.steps.map((step, index) => (
            <View key={`${guide.id}-step-${index}`} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text selectable style={styles.listText}>{step}</Text>
            </View>
          ))}
        </View>
      </GuideSection>

      <GuideSection icon={<AlertTriangle color={colors.coralDark} size={18} strokeWidth={2.4} />} title="常见错误">
        <View style={styles.list}>
          {guide.commonMistakes.map((mistake) => (
            <View key={mistake} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text selectable style={styles.listText}>{mistake}</Text>
            </View>
          ))}
        </View>
      </GuideSection>

      <GuideSection icon={<CircleStop color={colors.danger} size={18} strokeWidth={2.4} />} title="立即停止">
        <View style={styles.stopCard}>
          {guide.stopConditions.map((condition) => (
            <View key={condition} style={styles.bulletRow}>
              <Text style={styles.stopBullet}>•</Text>
              <Text selectable style={styles.stopText}>{condition}</Text>
            </View>
          ))}
          {warning ? <Text selectable style={styles.templateWarning}>{warning}</Text> : null}
        </View>
      </GuideSection>

      <GuideSection icon={<Repeat2 color={colors.teal} size={18} strokeWidth={2.4} />} title="难度调整">
        <View style={styles.alternativeList}>
          <Text selectable style={styles.alternativeText}><Text style={styles.alternativeLabel}>简单：</Text>{guide.alternatives.easier}</Text>
          <Text selectable style={styles.alternativeText}><Text style={styles.alternativeLabel}>同目标：</Text>{guide.alternatives.sameLevel}</Text>
          <Text selectable style={styles.alternativeText}><Text style={styles.alternativeLabel}>进阶：</Text>{guide.alternatives.harder}</Text>
        </View>
      </GuideSection>

      <View style={styles.globalSafetyCard}>
        <AlertTriangle color={colors.danger} size={18} strokeWidth={2.5} />
        <Text selectable style={styles.globalSafetyText}>{exerciseGuideSafetyNotice}</Text>
      </View>

      <Text selectable style={styles.dataSource}>
        动作资料整理自 Exercises Dataset（MIT）
        {guide.sourceExerciseId ? ` · ${guide.sourceExerciseId} ${guide.sourceExerciseName}` : ''}
      </Text>
      {guide.mediaKey ? (
        <Text selectable style={styles.dataSource}>媒体分发受 Gym visual 单独许可条款约束。</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  mediaCard: {
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  media: {
    width: 180,
    height: 180,
    backgroundColor: colors.surface,
  },
  mediaControls: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaControl: {
    flex: 1,
    minWidth: 130,
    minHeight: 44,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  mediaControlActive: {
    borderColor: colors.blue,
    backgroundColor: colors.blue,
  },
  mediaControlDisabled: {
    opacity: 0.45,
  },
  mediaControlText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  mediaControlTextActive: {
    color: colors.white,
  },
  mediaNote: {
    width: '100%',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    backgroundColor: colors.softYellow,
  },
  mediaNoteText: {
    flex: 1,
    color: colors.coralDark,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  attribution: {
    color: colors.inkMuted,
    fontSize: 10,
    lineHeight: 15,
  },
  mediaFailure: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.background,
  },
  mediaFailureText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  noMediaCard: {
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  noMediaCopy: {
    flex: 1,
    gap: 3,
  },
  noMediaTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  noMediaText: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  noMediaHint: {
    marginTop: 4,
    color: colors.blue,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  thumbnail: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  thumbnailFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.softBlue,
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleChip: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.background,
  },
  primaryMuscleChip: {
    backgroundColor: colors.softCoral,
  },
  muscleText: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  primaryMuscleText: {
    color: colors.coralDark,
    fontSize: 11,
    fontWeight: '800',
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  bodyText: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  quickTip: {
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    backgroundColor: colors.softTeal,
  },
  quickTipText: {
    flex: 1,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  list: {
    gap: 7,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  stepNumber: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.softPurple,
  },
  stepNumberText: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  listText: {
    flex: 1,
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  bullet: {
    color: colors.coralDark,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
  },
  stopCard: {
    gap: 7,
    padding: 11,
    borderLeftColor: colors.danger,
    borderLeftWidth: 4,
    backgroundColor: colors.softCoral,
  },
  stopBullet: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
  },
  stopText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  templateWarning: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  alternativeList: {
    gap: 7,
  },
  alternativeText: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  alternativeLabel: {
    color: colors.ink,
    fontWeight: '900',
  },
  globalSafetyCard: {
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    backgroundColor: colors.softCoral,
  },
  globalSafetyText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  dataSource: {
    color: colors.inkMuted,
    fontSize: 10,
    lineHeight: 15,
  },
  pressed: {
    opacity: 0.8,
  },
});
