import type { ExerciseTemplate, SetLog } from '../types';

export type SetLogPatch = Partial<
  Pick<SetLog, 'weightKg' | 'reps' | 'rir' | 'pain'>
>;

export function createExerciseSetLogs(
  exercise: ExerciseTemplate,
  previousCompletedSets: SetLog[],
): SetLog[] {
  const fallbackWeight = previousCompletedSets.findLast(
    (setLog) => setLog.weightKg !== null,
  )?.weightKg;

  return Array.from({ length: exercise.sets }, (_, index) => ({
    index,
    weightKg:
      exercise.equipment === 'dumbbell'
        ? previousCompletedSets[index]?.weightKg ?? fallbackWeight ?? null
        : null,
    reps: exercise.repMin,
    rir: 2,
    completed: false,
    pain: false,
  }));
}

export function applySetLogPatch(
  setLogs: SetLog[],
  targetSetIndex: number,
  patch: SetLogPatch,
): SetLog[] {
  const targetSet = setLogs.find((setLog) => setLog.index === targetSetIndex);

  if (!targetSet || targetSet.completed) {
    return setLogs;
  }

  const synchronizedPatch: SetLogPatch = {};
  if (Object.prototype.hasOwnProperty.call(patch, 'weightKg')) {
    synchronizedPatch.weightKg = patch.weightKg;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'reps')) {
    synchronizedPatch.reps = patch.reps;
  }

  return setLogs.map((setLog) => {
    if (setLog.completed) {
      return setLog;
    }

    if (setLog.index === targetSetIndex) {
      return { ...setLog, ...patch };
    }

    return Object.keys(synchronizedPatch).length > 0
      ? { ...setLog, ...synchronizedPatch }
      : setLog;
  });
}
