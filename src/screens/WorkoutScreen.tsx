import * as Haptics from 'expo-haptics';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheckBig,
  Clock3,
  Dumbbell,
  Info,
  Heart,
  Sparkles,
  TimerReset,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ExerciseGuidePanel, ExerciseGuideThumbnail } from '../components/ExerciseGuidePanel';
import { NumericStepper } from '../components/NumericStepper';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';
import { RestTimerBanner } from '../components/RestTimerBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import { getExerciseGuide } from '../data/exerciseGuides';
import {
  CURRENT_WORKOUT_TEMPLATE_VERSION,
  getWorkoutTemplate,
  workoutTemplates,
} from '../data/workoutPlan';
import {
  formatWorkoutDurationClock,
  getLocalDateKey,
  getTodayWorkoutState,
  getWorkoutDurationSeconds,
} from '../domain/dateTime';
import { getProgressionSuggestion } from '../domain/progression';
import type { SetLogPatch } from '../domain/workoutSets';
import { useAppStore } from '../state/AppStore';
import { useChatStore } from '../state/ChatStore';
import { colors } from '../theme';
import type {
  ExerciseLog,
  ExerciseTemplate,
  SetLog,
  WorkoutKind,
  WorkoutSession,
} from '../types';

interface SetEditorProps {
  exercise: ExerciseTemplate;
  setLog: SetLog;
  weightStepKg: number;
  onUpdate: (patch: SetLogPatch) => void;
  onComplete: () => void;
}

const exerciseSections: Array<{ key: ExerciseTemplate['section']; label: string }> = [
  { key: 'strength', label: '力量训练' },
  { key: 'core', label: '核心训练' },
];

function getSessionExerciseHistory(
  sessions: WorkoutSession[],
  exerciseId: string,
  activeSessionId: string,
): ExerciseLog[] {
  return sessions
    .filter((session) => session.status === 'completed' && session.id !== activeSessionId)
    .slice()
    .reverse()
    .flatMap((session) => session.exerciseLogs.filter((log) => log.exerciseId === exerciseId));
}

function formatClockTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function RirSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.rirGroup} accessibilityLabel="剩余次数 RIR">
      {[0, 1, 2, 3].map((rir) => {
        const selected = value === rir;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            key={rir}
            onPress={() => onChange(rir)}
            style={({ pressed }) => [
              styles.rirOption,
              selected && styles.rirOptionSelected,
              disabled && styles.controlDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.rirText, selected && styles.rirTextSelected]}>{rir === 3 ? '3+' : rir}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// [Function] 编辑单组训练数据。[Warning] 已完成组永久锁定，同步只覆盖未完成组。
function SetEditor({ exercise, setLog, weightStepKg, onUpdate, onComplete }: SetEditorProps) {
  const needsWeight = exercise.equipment === 'dumbbell';
  const canComplete = setLog.reps > 0 && (!needsWeight || (setLog.weightKg ?? 0) > 0);

  return (
    <View style={[styles.setCard, setLog.completed && styles.setCardCompleted]}>
      <View style={styles.setHeader}>
        <View style={styles.setTitleRow}>
          {setLog.completed ? <Check color={colors.teal} size={18} strokeWidth={3} /> : null}
          <Text style={styles.setTitle}>第 {setLog.index + 1} 组</Text>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: setLog.pain, disabled: setLog.completed }}
          disabled={setLog.completed}
          onPress={() => onUpdate({ pain: !setLog.pain })}
          style={({ pressed }) => [
            styles.painToggle,
            setLog.pain && styles.painToggleActive,
            setLog.completed && styles.controlDisabled,
            pressed && styles.pressed,
          ]}
        >
          <AlertTriangle color={setLog.pain ? colors.white : colors.inkMuted} size={15} strokeWidth={2.4} />
          <Text style={[styles.painText, setLog.pain && styles.painTextActive]}>不适</Text>
        </Pressable>
      </View>

      <View style={styles.stepperRow}>
        {needsWeight ? (
          <NumericStepper
            disabled={setLog.completed}
            label="单只哑铃"
            max={100}
            min={0}
            onChange={(weightKg) => onUpdate({ weightKg })}
            precision={weightStepKg < 1 ? 1 : 0}
            step={weightStepKg}
            suffix="kg"
            value={setLog.weightKg ?? 0}
          />
        ) : null}
        <NumericStepper
          disabled={setLog.completed}
          label={exercise.repUnit === '秒' ? '时长' : exercise.isPerSide ? '每侧次数' : '次数'}
          max={exercise.repUnit === '秒' ? 300 : 100}
          min={0}
          onChange={(reps) => onUpdate({ reps })}
          suffix={exercise.repUnit}
          value={setLog.reps}
        />
      </View>

      <View style={styles.rirRow}>
        <Text style={styles.rirLabel}>RIR</Text>
        <RirSelector
          disabled={setLog.completed}
          value={setLog.rir}
          onChange={(rir) => onUpdate({ rir })}
        />
      </View>

      {setLog.completed ? (
        <View
          accessibilityLabel="本组已完成，数据已锁定"
          style={[styles.completedSetStatus, styles.setAction]}
        >
          <Check color={colors.teal} size={18} strokeWidth={2.8} />
          <Text style={styles.completedSetStatusText}>本组已完成 · 数据已锁定</Text>
        </View>
      ) : (
        <PrimaryButton
          disabled={!canComplete}
          label="完成本组"
          icon={Check}
          onPress={onComplete}
          tone="dark"
          style={styles.setAction}
        />
      )}
    </View>
  );
}

interface ActiveWorkoutProps {
  session: WorkoutSession;
}

// [Function] 执行进行中的训练并保存每组状态。[Warning] 未完成全部组时结束需要二次确认。
function ActiveWorkout({ session }: ActiveWorkoutProps) {
  const chat = useChatStore();
  const {
    data,
    updateSet,
    completeSet,
    setCurrentExercise,
    addRestSeconds,
    skipRest,
    finishWorkout,
  } = useAppStore();
  const [nowMs, setNowMs] = useState(Date.now());
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showTechnique, setShowTechnique] = useState(false);
  const [encouragementText, setEncouragementText] = useState<string | null>(null);
  const latestEncouragement = chat.messages
    .filter((message) =>
      message.messageType === 'encouragement' &&
      message.receiverRole === 'owner' &&
      !message.recalledAt &&
      message.content)
    .at(-1) ?? null;
  const shownEncouragementIdRef = useRef(latestEncouragement?.messageId ?? null);
  const template = getWorkoutTemplate(session.kind, session.templateVersion ?? 1);
  const exerciseIndex = Math.min(session.currentExerciseIndex, template.exercises.length - 1);
  const exercise = template.exercises[exerciseIndex];
  const exerciseGuide = getExerciseGuide(exercise.id, session.templateVersion ?? 1);
  const exerciseLog = session.exerciseLogs.find((log) => log.exerciseId === exercise.id);
  const completedSets = session.exerciseLogs.reduce(
    (sum, log) => sum + log.sets.filter((setLog) => setLog.completed).length,
    0,
  );
  const totalSets = session.exerciseLogs.reduce((sum, log) => sum + log.sets.length, 0);
  const history = useMemo(
    () => getSessionExerciseHistory(data.sessions, exercise.id, session.id),
    [data.sessions, exercise.id, session.id],
  );
  const suggestion = getProgressionSuggestion(exercise, history, data.profile.weightStepKg);
  const durationSeconds = getWorkoutDurationSeconds(session, nowMs) ?? 0;

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setShowTechnique(false);
  }, [exercise.id]);

  useEffect(() => {
    if (!latestEncouragement || shownEncouragementIdRef.current === latestEncouragement.messageId) {
      return;
    }
    shownEncouragementIdRef.current = latestEncouragement.messageId;
    setEncouragementText(latestEncouragement.content);
    const timer = setTimeout(() => setEncouragementText(null), 4_500);
    return () => clearTimeout(timer);
  }, [latestEncouragement]);

  if (!exerciseLog) {
    return null;
  }

  const finish = () => {
    finishWorkout(session.id);
    setShowFinishModal(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const requestFinish = () => {
    if (completedSets === totalSets) {
      finish();
    } else {
      setShowFinishModal(true);
    }
  };

  const completeWorkoutSet = (setLog: SetLog) => {
    completeSet(session.id, exercise.id, setLog.index, exercise.restSeconds);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const updateWorkoutSet = (setLog: SetLog, patch: SetLogPatch) => {
    updateSet(session.id, exercise.id, setLog.index, patch);
  };

  return (
    <View style={styles.activeRoot}>
      <ScreenHeader
        eyebrow={template.shortTitle}
        title="训练进行中"
        action={{ label: '结束训练', icon: CircleCheckBig, onPress: requestFinish }}
      />

      {encouragementText ? (
        <View pointerEvents="none" style={styles.encouragementToast}>
          <Heart color={colors.white} fill={colors.white} size={20} />
          <Text style={styles.encouragementToastText}>{encouragementText}</Text>
        </View>
      ) : null}

      <View style={styles.sessionPanel}>
        <View style={styles.sessionTimeRow}>
          <View>
            <View style={styles.sessionLabelRow}>
              <Clock3 color={template.accent} size={15} strokeWidth={2.5} />
              <Text style={styles.sessionLabel}>训练时长</Text>
            </View>
            <Text style={styles.sessionTime}>{formatWorkoutDurationClock(durationSeconds)}</Text>
          </View>
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionStart}>{formatClockTime(session.startedAt)} 开始</Text>
            <Text style={styles.sessionSets}>{completedSets} / {totalSets} 组</Text>
          </View>
        </View>
        <ProgressBar color={template.accent} height={6} value={completedSets / totalSets} />
      </View>

      {session.restTimer ? (
        <RestTimerBanner
          nowMs={nowMs}
          onAddTime={() => addRestSeconds(30, session.id)}
          onSkip={() => skipRest(session.id)}
          timer={session.restTimer}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.activeContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          contentContainerStyle={styles.exerciseTabs}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {template.exercises.map((item, index) => {
            const log = session.exerciseLogs.find((entry) => entry.exerciseId === item.id);
            const isComplete = log?.sets.every((setLog) => setLog.completed) ?? false;
            const isCurrent = index === exerciseIndex;

            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isCurrent }}
                key={item.id}
                onPress={() => setCurrentExercise(index, session.id)}
                style={({ pressed }) => [
                  styles.exerciseTab,
                  isCurrent && { backgroundColor: template.accent },
                  pressed && styles.pressed,
                ]}
              >
                {isComplete ? (
                  <Check color={isCurrent ? colors.white : colors.teal} size={16} strokeWidth={2.8} />
                ) : (
                  <Text style={[styles.exerciseTabNumber, isCurrent && styles.exerciseTabNumberActive]}>{index + 1}</Text>
                )}
                <Text style={[styles.exerciseTabText, isCurrent && styles.exerciseTabTextActive]} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.exerciseHeading}>
          <Text style={styles.exercisePosition}>
            {exercise.section === 'core' ? '核心训练' : '力量训练'} · 动作 {exerciseIndex + 1} / {template.exercises.length}
          </Text>
          <Text style={styles.exerciseTitle}>{exercise.name}</Text>
          <Text style={styles.exerciseTarget}>
            {exercise.sets} 组 × {exercise.repMin}-{exercise.repMax} {exercise.repUnit}{exercise.isPerSide ? ' / 侧' : ''} · 休息 {exercise.restSeconds} 秒
          </Text>
          <Text style={styles.exerciseRirHint}>RIR 1-3 · 每组保留 1-3 次余力</Text>
        </View>

        <View style={[styles.suggestionBand, suggestion.tone === 'increase' && styles.suggestionIncrease, suggestion.tone === 'recover' && styles.suggestionRecover]}>
          <Sparkles
            color={suggestion.tone === 'recover' ? colors.danger : suggestion.tone === 'increase' ? colors.teal : colors.purple}
            size={20}
            strokeWidth={2.4}
          />
          <View style={styles.suggestionCopy}>
            <Text style={styles.suggestionTitle}>
              {suggestion.title}{suggestion.suggestedWeightKg !== undefined ? ` · ${suggestion.suggestedWeightKg}kg` : ''}
            </Text>
            <Text style={styles.suggestionDetail}>{suggestion.detail}</Text>
          </View>
        </View>

        <View style={styles.techniqueBand}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showTechnique }}
            onPress={() => setShowTechnique((visible) => !visible)}
            style={({ pressed }) => [styles.techniqueHeaderButton, pressed && styles.pressed]}
          >
            <View style={styles.techniqueTitleRow}>
              <Info color={colors.blue} size={18} strokeWidth={2.3} />
              <Text style={styles.techniqueTitle}>
                {exerciseGuide ? '动作示范与步骤' : '动作要点'}
              </Text>
            </View>
            {showTechnique ? (
              <ChevronUp color={colors.inkMuted} size={18} strokeWidth={2.3} />
            ) : (
              <ChevronDown color={colors.inkMuted} size={18} strokeWidth={2.3} />
            )}
          </Pressable>
          {showTechnique ? (
            <View style={styles.techniqueCopy}>
              {exerciseGuide ? (
                <ExerciseGuidePanel
                  guide={exerciseGuide}
                  key={exerciseGuide.id}
                  tip={exercise.tip}
                  warning={exercise.warning}
                  testID={`active-exercise-guide-${exercise.id}`}
                />
              ) : (
                <>
                  <Text style={styles.techniqueText}>{exercise.tip}</Text>
                  {exercise.warning ? <Text style={styles.warningText}>{exercise.warning}</Text> : null}
                </>
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.setList}>
          {exerciseLog.sets.map((setLog) => (
            <SetEditor
              exercise={exercise}
              key={setLog.index}
              onComplete={() => completeWorkoutSet(setLog)}
              onUpdate={(patch) => updateWorkoutSet(setLog, patch)}
              setLog={setLog}
              weightStepKg={data.profile.weightStepKg}
            />
          ))}
        </View>

        <View style={styles.exerciseNavigation}>
          <PrimaryButton
            disabled={exerciseIndex === 0}
            label="上一个"
            icon={ArrowLeft}
            onPress={() => setCurrentExercise(exerciseIndex - 1, session.id)}
            tone="light"
            style={styles.navigationButton}
          />
          {exerciseIndex < template.exercises.length - 1 ? (
            <PrimaryButton
              label="下一个"
              icon={ArrowRight}
              onPress={() => setCurrentExercise(exerciseIndex + 1, session.id)}
              tone="dark"
              style={styles.navigationButton}
            />
          ) : (
            <PrimaryButton
              label="结束训练"
              icon={CircleCheckBig}
              onPress={requestFinish}
              tone="teal"
              style={styles.navigationButton}
            />
          )}
        </View>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setShowFinishModal(false)} transparent visible={showFinishModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <View style={styles.modalIcon}>
              <TimerReset color={colors.coralDark} size={27} strokeWidth={2.3} />
            </View>
            <Text style={styles.modalTitle}>还有 {totalSets - completedSets} 组未完成</Text>
            <Text style={styles.modalText}>可以提前结束，但本次不会生成加重建议。</Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                label="继续训练"
                icon={X}
                onPress={() => setShowFinishModal(false)}
                tone="light"
                style={styles.modalButton}
              />
              <PrimaryButton
                label="仍然结束"
                icon={CircleCheckBig}
                onPress={finish}
                tone="coral"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// [Function] 展示今日计划或接管进行中的训练。[Warning] 补练不会改变固定周计划。
export function WorkoutScreen() {
  const { data, activeSession, startWorkout } = useAppStore();
  const [expandedPlanExerciseId, setExpandedPlanExerciseId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<WorkoutKind>(() => {
    const state = getTodayWorkoutState(new Date(), data.sessions, data.profile);
    return state.template?.kind ?? 'upper-a';
  });

  if (activeSession) {
    return <ActiveWorkout session={activeSession} />;
  }

  const now = new Date();
  const todayState = getTodayWorkoutState(now, data.sessions, data.profile);
  const selectedTemplate = getWorkoutTemplate(selectedKind);
  const selectedExerciseSections = exerciseSections
    .map((section) => ({
      ...section,
      exercises: selectedTemplate.exercises
        .map((exercise, index) => ({ exercise, index }))
        .filter(({ exercise }) => exercise.section === section.key),
    }))
    .filter((section) => section.exercises.length > 0);
  const isTodayPlan = todayState.template?.kind === selectedKind && !['completed', 'skipped'].includes(todayState.phase);

  return (
    <ScrollView contentContainerStyle={styles.planContent} showsVerticalScrollIndicator={false} testID="workout-screen">
      <ScreenHeader eyebrow="每周四练" title="训练计划" />

      <View style={styles.planHero}>
        <View style={[styles.planAccent, { backgroundColor: selectedTemplate.accent }]} />
        <View style={styles.planHeroCopy}>
          <Text style={styles.planEyebrow}>{isTodayPlan ? '今日计划' : '自选补练'}</Text>
          <Text style={styles.planTitle}>{selectedTemplate.title}</Text>
          <Text style={styles.planSubtitle}>{selectedTemplate.subtitle}</Text>
        </View>
        <Dumbbell color={selectedTemplate.accent} size={31} strokeWidth={2.2} />
      </View>

      <ScrollView contentContainerStyle={styles.planTabs} horizontal showsHorizontalScrollIndicator={false}>
        {workoutTemplates.map((template) => {
          const selected = selectedKind === template.kind;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={template.kind}
              onPress={() => {
                setSelectedKind(template.kind);
                setExpandedPlanExerciseId(null);
              }}
              style={({ pressed }) => [
                styles.planTab,
                selected && { backgroundColor: template.accent, borderColor: template.accent },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.planTabText, selected && styles.planTabTextActive]}>{template.shortTitle}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.planExerciseList}>
        {selectedExerciseSections.map((section) => (
          <View key={section.key} style={styles.planExerciseSection}>
            <Text style={styles.planSectionTitle}>{section.label}</Text>
            {section.exercises.map(({ exercise, index }) => {
              const guide = getExerciseGuide(exercise.id, CURRENT_WORKOUT_TEMPLATE_VERSION);
              const expanded = expandedPlanExerciseId === exercise.id;

              return (
                <View key={exercise.id} style={styles.planExerciseItem}>
                  <Pressable
                    accessibilityHint={expanded ? '收起动作说明' : '查看动作示范和分步骤说明'}
                    accessibilityLabel={`${exercise.name}，${exercise.sets}组，每组${exercise.repMin}到${exercise.repMax}${exercise.repUnit}${exercise.isPerSide ? '每侧' : ''}，${exercise.focus}`}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    onPress={() => setExpandedPlanExerciseId(expanded ? null : exercise.id)}
                    style={({ pressed }) => [
                      styles.planExerciseRow,
                      expanded && styles.planExerciseRowExpanded,
                      pressed && styles.pressed,
                    ]}
                    testID={`exercise-row-${exercise.id}`}
                  >
                    <View style={[styles.planExerciseIndex, { backgroundColor: `${selectedTemplate.accent}18` }]}>
                      <Text style={[styles.planExerciseIndexText, { color: selectedTemplate.accent }]}>{index + 1}</Text>
                    </View>
                    {guide ? <ExerciseGuideThumbnail guide={guide} /> : null}
                    <View style={styles.planExerciseCopy}>
                      <Text style={styles.planExerciseName}>{exercise.name}</Text>
                      <Text style={styles.planExerciseMeta}>
                        {exercise.sets} × {exercise.repMin}-{exercise.repMax}{exercise.repUnit}{exercise.isPerSide ? '/侧' : ''} · {exercise.focus}
                        {guide?.mediaKey ? ' · 图 © Gym visual' : ''}
                        {guide?.mediaMatch === 'adapted' ? ' · 示范有调整' : ''}
                      </Text>
                    </View>
                    {expanded ? (
                      <ChevronUp color={colors.inkMuted} size={18} strokeWidth={2.3} />
                    ) : (
                      <ChevronDown color={colors.inkMuted} size={18} strokeWidth={2.3} />
                    )}
                  </Pressable>
                  {expanded && guide ? (
                    <View style={styles.planExerciseDetail}>
                      <ExerciseGuidePanel
                        guide={guide}
                        tip={exercise.tip}
                        warning={exercise.warning}
                        testID={`exercise-detail-${exercise.id}`}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.startArea}>
        <PrimaryButton
          label={isTodayPlan ? '开始今日训练' : '开始补练'}
          icon={Dumbbell}
          onPress={() => startWorkout(selectedKind, getLocalDateKey(now), isTodayPlan ? 'scheduled' : 'makeup')}
          tone="coral"
          testID="start-workout"
        />
        <Text style={styles.startHint}>
          全套仅需地面、哑铃、臂力棒和靠墙防滑的稳固椅；哑铃重量按单只记录，出现不适立即停止。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  activeRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sessionPanel: {
    marginHorizontal: 16,
    padding: 14,
    gap: 12,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  sessionTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  sessionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  sessionTime: {
    marginTop: 4,
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
  },
  sessionMeta: {
    alignItems: 'flex-end',
    paddingBottom: 2,
  },
  sessionStart: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
  },
  sessionSets: {
    marginTop: 5,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  activeContent: {
    paddingBottom: 34,
  },
  exerciseTabs: {
    paddingHorizontal: 16,
    paddingTop: 17,
    paddingBottom: 4,
    gap: 8,
  },
  exerciseTab: {
    height: 42,
    maxWidth: 155,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  exerciseTabNumber: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  exerciseTabNumberActive: {
    color: colors.white,
  },
  exerciseTabText: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  exerciseTabTextActive: {
    color: colors.white,
  },
  exerciseHeading: {
    paddingHorizontal: 20,
    paddingTop: 26,
  },
  exercisePosition: {
    color: colors.coralDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  exerciseTitle: {
    marginTop: 6,
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 33,
    letterSpacing: 0,
  },
  exerciseTarget: {
    marginTop: 6,
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0,
  },
  exerciseRirHint: {
    marginTop: 5,
    color: colors.inkMuted,
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: 0,
  },
  suggestionBand: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderLeftColor: colors.purple,
    borderLeftWidth: 4,
    backgroundColor: colors.softPurple,
  },
  suggestionIncrease: {
    borderLeftColor: colors.teal,
    backgroundColor: colors.softTeal,
  },
  suggestionRecover: {
    borderLeftColor: colors.danger,
    backgroundColor: colors.softCoral,
  },
  suggestionCopy: {
    flex: 1,
  },
  suggestionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  suggestionDetail: {
    marginTop: 4,
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
  },
  techniqueBand: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 13,
    borderRadius: 8,
    backgroundColor: colors.softBlue,
  },
  techniqueHeaderButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  techniqueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  techniqueTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  techniqueCopy: {
    marginTop: 10,
  },
  techniqueText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0,
  },
  warningText: {
    marginTop: 5,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: 0,
  },
  setList: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 12,
  },
  setCard: {
    padding: 15,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  setCardCompleted: {
    borderColor: '#BFE9DE',
    backgroundColor: '#F4FCFA',
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  setTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  painToggle: {
    minHeight: 36,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  painToggleActive: {
    backgroundColor: colors.danger,
  },
  painText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  painTextActive: {
    color: colors.white,
  },
  encouragementToast: {
    position: 'absolute', top: 76, left: 18, right: 18, zIndex: 20,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 9,
    borderRadius: 12, backgroundColor: colors.coral,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  encouragementToastText: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  controlDisabled: {
    opacity: 0.45,
  },
  stepperRow: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  rirRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rirLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  rirGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  rirOption: {
    height: 34,
    minWidth: 34,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  rirOptionSelected: {
    backgroundColor: colors.purple,
  },
  rirText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  rirTextSelected: {
    color: colors.white,
  },
  setAction: {
    marginTop: 16,
  },
  completedSetStatus: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: colors.softTeal,
  },
  completedSetStatusText: {
    color: colors.teal,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
  exerciseNavigation: {
    paddingHorizontal: 16,
    paddingTop: 22,
    flexDirection: 'row',
    gap: 10,
  },
  navigationButton: {
    flex: 1,
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
    padding: 20,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  modalIcon: {
    height: 50,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.softCoral,
  },
  modalTitle: {
    marginTop: 16,
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  modalText: {
    marginTop: 8,
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0,
  },
  modalActions: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 9,
  },
  modalButton: {
    flex: 1,
  },
  planContent: {
    paddingBottom: 34,
  },
  planHero: {
    minHeight: 128,
    marginHorizontal: 16,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 8,
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  planAccent: {
    alignSelf: 'stretch',
    width: 5,
    borderRadius: 3,
  },
  planHeroCopy: {
    flex: 1,
  },
  planEyebrow: {
    color: colors.coralDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  planTitle: {
    marginTop: 5,
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
    letterSpacing: 0,
  },
  planSubtitle: {
    marginTop: 5,
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0,
  },
  planTabs: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  planTab: {
    height: 42,
    minWidth: 82,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  planTabText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  planTabTextActive: {
    color: colors.white,
  },
  planExerciseList: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 22,
  },
  planExerciseSection: {
    gap: 2,
  },
  planExerciseItem: {
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  planSectionTitle: {
    marginBottom: 4,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  planExerciseRow: {
    minHeight: 70,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  planExerciseRowExpanded: {
    paddingBottom: 8,
  },
  planExerciseDetail: {
    paddingBottom: 16,
  },
  planExerciseIndex: {
    height: 38,
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  planExerciseIndexText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  planExerciseCopy: {
    flex: 1,
  },
  planExerciseName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
  planExerciseMeta: {
    marginTop: 4,
    color: colors.inkMuted,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0,
  },
  startArea: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  startHint: {
    marginTop: 10,
    color: colors.inkMuted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
