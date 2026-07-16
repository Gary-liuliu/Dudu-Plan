import type { ExerciseTemplate, SetLog } from '../types';
import { applySetLogPatch, createExerciseSetLogs } from './workoutSets';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function createSetLog(
  index: number,
  weightKg: number | null,
  reps: number,
  completed = false,
): SetLog {
  return {
    index,
    weightKg,
    reps,
    rir: 2,
    completed,
    pain: false,
  };
}

const dumbbellExercise: ExerciseTemplate = {
  id: 'test-dumbbell-exercise',
  name: '测试哑铃动作',
  focus: '测试',
  sets: 4,
  repMin: 8,
  repMax: 12,
  repUnit: '次',
  restSeconds: 90,
  equipment: 'dumbbell',
  section: 'strength',
  tip: '保持动作稳定。',
};

const previousCompletedSets = [
  createSetLog(0, 8, 12, true),
  createSetLog(1, null, 10, true),
  createSetLog(2, 10, 9, true),
];
const initializedSetLogs = createExerciseSetLogs(
  dumbbellExercise,
  previousCompletedSets,
);

assertEqual(initializedSetLogs.length, 4, '初始化组数应匹配训练要求');
assertEqual(initializedSetLogs[0].weightKg, 8, '相同组序号应优先沿用历史重量');
assertEqual(initializedSetLogs[1].weightKg, 10, '历史空重量应回退到最近有效重量');
assertEqual(initializedSetLogs[3].weightKg, 10, '缺少同序号历史时应回退到最近有效重量');
assertEqual(initializedSetLogs[0].reps, 8, '次数应默认使用动作要求下限');
assertEqual(initializedSetLogs[3].reps, 8, '每组次数都应使用动作要求下限');
assertEqual(initializedSetLogs[0].completed, false, '新组应保持未完成');

const unsynchronizedSetLogs = [
  createSetLog(0, 8, 8),
  createSetLog(1, 9, 9),
  createSetLog(2, 10, 10),
];
const synchronizedSetLogs = applySetLogPatch(unsynchronizedSetLogs, 1, {
  weightKg: 12,
  reps: 11,
  rir: 1,
  pain: true,
});

for (const setLog of synchronizedSetLogs) {
  assertEqual(setLog.weightKg, 12, '重量应同步到所有未完成组');
  assertEqual(setLog.reps, 11, '次数应同步到所有未完成组');
}
assertEqual(synchronizedSetLogs[0].rir, 2, 'RIR 不应同步到其他组');
assertEqual(synchronizedSetLogs[0].pain, false, '不适状态不应同步到其他组');
assertEqual(synchronizedSetLogs[1].rir, 1, 'RIR 应更新目标组');
assertEqual(synchronizedSetLogs[1].pain, true, '不适状态应更新目标组');

const completedSet = createSetLog(0, 7, 7, true);
const partiallyCompletedSetLogs = [
  completedSet,
  createSetLog(1, 9, 9),
  createSetLog(2, 10, 10),
];
const updatedIncompleteSetLogs = applySetLogPatch(partiallyCompletedSetLogs, 1, {
  weightKg: 14,
  reps: 12,
});

assertEqual(updatedIncompleteSetLogs[0], completedSet, '同步时已完成组应保持原对象');
assertEqual(updatedIncompleteSetLogs[0].weightKg, 7, '同步时不得覆盖已完成组重量');
assertEqual(updatedIncompleteSetLogs[0].reps, 7, '同步时不得覆盖已完成组次数');
assertEqual(updatedIncompleteSetLogs[2].weightKg, 14, '重量应同步到其余未完成组');
assertEqual(updatedIncompleteSetLogs[2].reps, 12, '次数应同步到其余未完成组');

const completedTargetSetLogs = [
  createSetLog(0, 8, 8, true),
  createSetLog(1, 9, 9),
];
const completedTargetResult = applySetLogPatch(completedTargetSetLogs, 0, {
  weightKg: 20,
  reps: 20,
  rir: 0,
  pain: true,
});

assertEqual(completedTargetResult, completedTargetSetLogs, '已完成目标组应拒绝全部更新');

const missingTargetResult = applySetLogPatch(completedTargetSetLogs, 99, {
  reps: 20,
});
assertEqual(missingTargetResult, completedTargetSetLogs, '不存在的目标组应原样返回');
