import {
  CURRENT_WORKOUT_TEMPLATE_VERSION,
  getWorkoutTemplate,
  workoutTemplates,
} from '../data/workoutPlan';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertArrayEqual(actual: string[], expected: string[], message: string): void {
  assertEqual(actual.join(','), expected.join(','), message);
}

assertEqual(CURRENT_WORKOUT_TEMPLATE_VERSION, 2, '当前训练模板版本应为 v2');

const legacyLowerA = getWorkoutTemplate('lower-a', 1);
assertArrayEqual(
  legacyLowerA.exercises.map((exercise) => exercise.id),
  [
    'goblet-squat',
    'dumbbell-romanian-deadlift',
    'reverse-lunge',
    'alternating-leg-lower',
    'forearm-plank',
  ],
  'v1 下肢 A 动作顺序不能变化',
);
assertEqual(legacyLowerA.exercises[4].repMin, 30, 'v1 平板支撑下限应保持 30 秒');

const legacyLowerB = getWorkoutTemplate('lower-b', 1);
assertArrayEqual(
  legacyLowerB.exercises.map((exercise) => exercise.id),
  [
    'rear-foot-elevated-split-squat',
    'staggered-stance-romanian-deadlift',
    'dumbbell-glute-bridge',
    'standing-calf-raise',
    'dead-bug',
    'side-plank',
  ],
  'v1 下肢 B 动作顺序不能变化',
);

const currentLowerA = getWorkoutTemplate('lower-a');
const alternatingLegLower = currentLowerA.exercises[3];
const forearmPlank = currentLowerA.exercises[4];
assertEqual(alternatingLegLower.id, 'alternating-leg-lower', 'v2 下肢 A 应保留交替抬腿');
assertEqual(alternatingLegLower.section, 'core', '交替抬腿应归入核心训练');
assertEqual(alternatingLegLower.sets, 3, '交替抬腿应训练 3 组');
assertEqual(alternatingLegLower.repMin, 10, '交替抬腿最低应为每侧 10 次');
assertEqual(alternatingLegLower.repMax, 15, '交替抬腿最高应为每侧 15 次');
assertEqual(alternatingLegLower.isPerSide, true, '交替抬腿应按每侧记录');
assertEqual(forearmPlank.section, 'core', '平板支撑应归入核心训练');
assertEqual(forearmPlank.repMin, 45, 'v2 平板支撑下限应为 45 秒');
assertEqual(forearmPlank.repMax, 60, 'v2 平板支撑上限应为 60 秒');

const currentLowerB = getWorkoutTemplate('lower-b');
const weightedCrunch = currentLowerB.exercises[4];
const sidePlank = currentLowerB.exercises[5];
assertEqual(weightedCrunch.id, 'dumbbell-weighted-crunch', 'v2 应以哑铃负重卷腹替换死虫式');
assertEqual(weightedCrunch.section, 'core', '哑铃负重卷腹应归入核心训练');
assertEqual(weightedCrunch.equipment, 'dumbbell', '哑铃负重卷腹应记录哑铃重量');
assertEqual(weightedCrunch.sets, 3, '哑铃负重卷腹应训练 3 组');
assertEqual(weightedCrunch.repMin, 10, '哑铃负重卷腹最低应为 10 次');
assertEqual(weightedCrunch.repMax, 15, '哑铃负重卷腹最高应为 15 次');
assertEqual(weightedCrunch.restSeconds, 60, '哑铃负重卷腹组间休息应为 60 秒');
assertEqual(sidePlank.id, 'side-plank', 'v2 应保留侧平板支撑的位置');
assertEqual(sidePlank.section, 'core', '侧平板支撑应归入核心训练');
assertEqual(sidePlank.repMin, 20, '侧平板支撑下限应为每侧 20 秒');
assertEqual(sidePlank.repMax, 45, '侧平板支撑上限应为每侧 45 秒');
assertEqual(sidePlank.isPerSide, true, '侧平板支撑应按每侧记录');

const hasUnclassifiedExercise = workoutTemplates.some((template) =>
  template.exercises.some((exercise) => !['strength', 'core'].includes(exercise.section)),
);
assertEqual(hasUnclassifiedExercise, false, 'v2 所有动作都必须归入训练分组');
