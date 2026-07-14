import type {
  ExerciseLog,
  ExerciseTemplate,
  ProgressionSuggestion,
  SetLog,
} from '../types';

const requiredSuccessfulSessions = 2;
const minimumRirToIncrease = 2;

function getCompletedSets(exerciseLog: ExerciseLog | undefined): SetLog[] {
  return exerciseLog?.sets.filter((set) => set.completed) ?? [];
}

function hasPain(exerciseLog: ExerciseLog | undefined): boolean {
  return exerciseLog?.sets.some((set) => set.pain) ?? false;
}

function meetsIncreaseStandard(
  exercise: ExerciseTemplate,
  exerciseLog: ExerciseLog | undefined,
): boolean {
  const completedSets = getCompletedSets(exerciseLog);

  return (
    !hasPain(exerciseLog) &&
    completedSets.length >= exercise.sets &&
    completedSets.every(
      (set) => set.reps >= exercise.repMax && set.rir >= minimumRirToIncrease,
    )
  );
}

function getConsistentWorkingWeight(exerciseLog: ExerciseLog | undefined): number | null {
  const weights = getCompletedSets(exerciseLog)
    .map((set) => set.weightKg)
    .filter((weight): weight is number => weight !== null && Number.isFinite(weight));

  if (weights.length === 0 || weights.some((weight) => weight !== weights[0])) {
    return null;
  }

  return weights[0];
}

function roundWeight(weightKg: number): number {
  return Math.round(weightKg * 100) / 100;
}

// [Function] 根据最近记录生成保守进阶建议。[Warning] 疼痛记录始终阻止加重。
export function getProgressionSuggestion(
  exercise: ExerciseTemplate,
  recentExerciseLogsNewestFirst: ExerciseLog[],
  weightStepKg: number,
): ProgressionSuggestion {
  const latestLog = recentExerciseLogsNewestFirst[0];
  const latestCompletedSets = getCompletedSets(latestLog);

  if (!latestLog || latestCompletedSets.length === 0) {
    return {
      tone: 'baseline',
      title: '建立基准',
      detail: '选择能完成次数下限，并保留 2-3 次余力的难度。',
    };
  }

  if (hasPain(latestLog)) {
    return {
      tone: 'recover',
      title: '先恢复，不加重',
      detail: '本次记录了疼痛；先停止加重，确认动作恢复到无痛范围。',
    };
  }

  if (latestCompletedSets.length < exercise.sets) {
    return {
      tone: 'hold',
      title: '先完成计划组数',
      detail: `本次完成 ${latestCompletedSets.length}/${exercise.sets} 组，完整记录后再判断。`,
    };
  }

  const setsBelowRange = latestCompletedSets.filter(
    (set) => set.reps < exercise.repMin,
  ).length;
  const latestWorkingWeight = getConsistentWorkingWeight(latestLog);

  if (setsBelowRange >= 2) {
    const canSuggestWeight =
      exercise.equipment === 'dumbbell' &&
      latestWorkingWeight !== null &&
      Number.isFinite(weightStepKg) &&
      weightStepKg > 0;

    return {
      tone: 'reduce',
      title: '降低一个配重档位',
      detail: '至少两组未达到次数下限，先减轻难度并恢复标准动作。',
      suggestedWeightKg: canSuggestWeight
        ? roundWeight(Math.max(0, latestWorkingWeight - weightStepKg))
        : undefined,
    };
  }

  const successfulLogs = recentExerciseLogsNewestFirst
    .slice(0, requiredSuccessfulSessions)
    .filter((exerciseLog) => meetsIncreaseStandard(exercise, exerciseLog));

  if (successfulLogs.length === requiredSuccessfulSessions) {
    if (exercise.equipment === 'dumbbell') {
      const previousWorkingWeight = getConsistentWorkingWeight(successfulLogs[1]);
      const hasStableWeight =
        latestWorkingWeight !== null && previousWorkingWeight === latestWorkingWeight;
      const hasValidWeightStep = Number.isFinite(weightStepKg) && weightStepKg > 0;

      if (hasStableWeight && hasValidWeightStep) {
        return {
          tone: 'increase',
          title: '增加一个配重档位',
          detail: '连续两次所有工作组达到上限且仍有余力，可以小幅加重。',
          suggestedWeightKg: roundWeight(latestWorkingWeight + weightStepKg),
        };
      }

      return {
        tone: 'hold',
        title: '先稳定当前重量',
        detail: '两次记录的工作重量不一致，保持同一重量完成后再加重。',
      };
    }

    return {
      tone: 'increase',
      title: '提高动作难度',
      detail: '连续两次达到上限且仍有余力，可增加停顿或选择更难的变式。',
    };
  }

  if (meetsIncreaseStandard(exercise, latestLog)) {
    return {
      tone: 'hold',
      title: '再稳定一次',
      detail: '本次已达到上限；下次同样完成并保留余力后再加重。',
    };
  }

  return {
    tone: 'hold',
    title: '保持当前难度',
    detail: '先让所有工作组进入目标次数范围，并保留 1-2 次余力。',
  };
}
