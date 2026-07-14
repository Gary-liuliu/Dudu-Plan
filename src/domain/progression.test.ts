import { getProgressionSuggestion } from './progression';
import type { ExerciseLog, ExerciseTemplate, SetLog } from '../types';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const dumbbellExercise: ExerciseTemplate = {
  id: 'test-press',
  name: '测试推举',
  focus: '测试',
  sets: 3,
  repMin: 8,
  repMax: 12,
  repUnit: '次',
  restSeconds: 120,
  equipment: 'dumbbell',
  tip: '保持动作稳定。',
};

function createSet(
  index: number,
  reps: number,
  rir: number,
  weightKg: number | null = 10,
  pain = false,
): SetLog {
  return {
    index,
    weightKg,
    reps,
    rir,
    completed: true,
    pain,
  };
}

function createLog(sets: SetLog[]): ExerciseLog {
  return { exerciseId: dumbbellExercise.id, sets };
}

const baselineSuggestion = getProgressionSuggestion(dumbbellExercise, [], 1);
assertEqual(baselineSuggestion.tone, 'baseline', '空历史应建立基准');

const successfulLog = createLog([
  createSet(0, 12, 2),
  createSet(1, 12, 2),
  createSet(2, 12, 2),
]);
const oneSuccessSuggestion = getProgressionSuggestion(
  dumbbellExercise,
  [successfulLog],
  1,
);
assertEqual(oneSuccessSuggestion.tone, 'hold', '单次达标不应加重');

const twoSuccessSuggestion = getProgressionSuggestion(
  dumbbellExercise,
  [successfulLog, successfulLog],
  1,
);
assertEqual(twoSuccessSuggestion.tone, 'increase', '连续两次达标应加重');
assertEqual(twoSuccessSuggestion.suggestedWeightKg, 11, '应增加一个配重档位');

const painfulLog = createLog([
  createSet(0, 12, 2),
  createSet(1, 12, 2, 10, true),
  createSet(2, 12, 2),
]);
const painfulSuggestion = getProgressionSuggestion(
  dumbbellExercise,
  [painfulLog, successfulLog],
  1,
);
assertEqual(painfulSuggestion.tone, 'recover', '疼痛记录应阻止加重');

const belowRangeLog = createLog([
  createSet(0, 7, 0),
  createSet(1, 6, 0),
  createSet(2, 8, 0),
]);
const reduceSuggestion = getProgressionSuggestion(
  dumbbellExercise,
  [belowRangeLog],
  1,
);
assertEqual(reduceSuggestion.tone, 'reduce', '两组低于下限应减重');
assertEqual(reduceSuggestion.suggestedWeightKg, 9, '应降低一个配重档位');

const changedWeightLog = createLog([
  createSet(0, 12, 2, 9),
  createSet(1, 12, 2, 9),
  createSet(2, 12, 2, 9),
]);
const changedWeightSuggestion = getProgressionSuggestion(
  dumbbellExercise,
  [successfulLog, changedWeightLog],
  1,
);
assertEqual(changedWeightSuggestion.tone, 'hold', '不同工作重量不应直接加重');

const bodyweightExercise: ExerciseTemplate = {
  ...dumbbellExercise,
  id: 'test-plank',
  equipment: 'bodyweight',
  repUnit: '秒',
};
const bodyweightLog: ExerciseLog = {
  exerciseId: bodyweightExercise.id,
  sets: [
    createSet(0, 12, 2, null),
    createSet(1, 12, 2, null),
    createSet(2, 12, 2, null),
  ],
};
const bodyweightSuggestion = getProgressionSuggestion(
  bodyweightExercise,
  [bodyweightLog, bodyweightLog],
  1,
);
assertEqual(bodyweightSuggestion.tone, 'increase', '自重动作达标后应提高动作难度');
assertEqual(
  bodyweightSuggestion.suggestedWeightKg,
  undefined,
  '自重动作不应建议哑铃重量',
);
