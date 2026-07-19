import {
  CURRENT_WORKOUT_TEMPLATE_VERSION,
  getWorkoutTemplate,
  workoutTemplates,
} from '../data/workoutPlan';
import type { ExerciseTemplate, WorkoutKind, WorkoutTemplate } from '../types';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertArrayEqual(actual: string[], expected: string[], message: string): void {
  assertEqual(actual.join(','), expected.join(','), message);
}

function assertIncludes(value: string | undefined, expected: string, message: string): void {
  assertEqual(value?.includes(expected) ?? false, true, message);
}

function getRequiredExercise(template: WorkoutTemplate, exerciseId: string): ExerciseTemplate {
  const exercise = template.exercises.find((candidate) => candidate.id === exerciseId);
  if (!exercise) {
    throw new Error(`${template.kind} 缺少动作 ${exerciseId}`);
  }
  return exercise;
}

assertEqual(CURRENT_WORKOUT_TEMPLATE_VERSION, 3, '当前训练模板版本应为 v3');

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

const legacyUpperBIds = [
  'neutral-grip-floor-press',
  'dumbbell-pullover',
  'wide-elbow-dumbbell-row',
  'seated-dumbbell-press',
  'dumbbell-lateral-raise',
  'power-bar-bend',
];
assertArrayEqual(
  getWorkoutTemplate('upper-b', 1).exercises.map((exercise) => exercise.id),
  legacyUpperBIds,
  'v1 上肢 B 必须保留原动作顺序',
);
assertArrayEqual(
  getWorkoutTemplate('upper-b', 2).exercises.map((exercise) => exercise.id),
  legacyUpperBIds,
  'v2 上肢 B 必须保留原动作顺序',
);
assertEqual(
  getRequiredExercise(getWorkoutTemplate('upper-a', 2), 'dumbbell-bench-press').name,
  '哑铃平卧推举',
  'v2 上肢 A 不得被 v3 居家名称覆盖',
);
assertEqual(
  getRequiredExercise(getWorkoutTemplate('upper-b', 2), 'dumbbell-pullover').name,
  '哑铃仰卧上拉',
  'v2 上肢 B 不得被 v3 地板动作名称覆盖',
);

const versionTwoLowerA = getWorkoutTemplate('lower-a', 2);
const alternatingLegLower = versionTwoLowerA.exercises[3];
const forearmPlank = versionTwoLowerA.exercises[4];
assertEqual(alternatingLegLower.id, 'alternating-leg-lower', 'v2 下肢 A 应保留交替抬腿');
assertEqual(alternatingLegLower.section, 'core', '交替抬腿应归入核心训练');
assertEqual(alternatingLegLower.sets, 3, '交替抬腿应训练 3 组');
assertEqual(alternatingLegLower.repMin, 10, '交替抬腿最低应为每侧 10 次');
assertEqual(alternatingLegLower.repMax, 15, '交替抬腿最高应为每侧 15 次');
assertEqual(alternatingLegLower.isPerSide, true, '交替抬腿应按每侧记录');
assertEqual(forearmPlank.section, 'core', '平板支撑应归入核心训练');
assertEqual(forearmPlank.repMin, 45, 'v2 平板支撑下限应为 45 秒');
assertEqual(forearmPlank.repMax, 60, 'v2 平板支撑上限应为 60 秒');

const versionTwoLowerB = getWorkoutTemplate('lower-b', 2);
const weightedCrunch = versionTwoLowerB.exercises[4];
const versionTwoSidePlank = versionTwoLowerB.exercises[5];
assertEqual(weightedCrunch.id, 'dumbbell-weighted-crunch', 'v2 应以哑铃负重卷腹替换死虫式');
assertEqual(weightedCrunch.section, 'core', '哑铃负重卷腹应归入核心训练');
assertEqual(weightedCrunch.equipment, 'dumbbell', '哑铃负重卷腹应记录哑铃重量');
assertEqual(weightedCrunch.sets, 3, '哑铃负重卷腹应训练 3 组');
assertEqual(weightedCrunch.repMin, 10, '哑铃负重卷腹最低应为 10 次');
assertEqual(weightedCrunch.repMax, 15, '哑铃负重卷腹最高应为 15 次');
assertEqual(weightedCrunch.restSeconds, 60, '哑铃负重卷腹组间休息应为 60 秒');
assertEqual(versionTwoSidePlank.id, 'side-plank', 'v2 应保留侧平板支撑的位置');
assertEqual(versionTwoSidePlank.section, 'core', '侧平板支撑应归入核心训练');
assertEqual(versionTwoSidePlank.repMin, 20, '侧平板支撑下限应为每侧 20 秒');
assertEqual(versionTwoSidePlank.repMax, 45, '侧平板支撑上限应为每侧 45 秒');
assertEqual(versionTwoSidePlank.isPerSide, true, '侧平板支撑应按每侧记录');

const versionThreeUpperA = getWorkoutTemplate('upper-a', 3);
assertEqual(
  getRequiredExercise(versionThreeUpperA, 'dumbbell-bench-press').name,
  '标准握哑铃地板卧推',
  'v3 上肢 A 应使用地板卧推',
);
assertEqual(
  getRequiredExercise(versionThreeUpperA, 'one-arm-dumbbell-row').name,
  '扶椅单臂哑铃划船',
  'v3 上肢 A 应明确扶椅划船',
);
assertEqual(
  getRequiredExercise(versionThreeUpperA, 'seated-dumbbell-press').name,
  '普通椅坐姿哑铃推举',
  'v3 上肢 A 应明确普通椅推举',
);
assertIncludes(
  getRequiredExercise(versionThreeUpperA, 'dumbbell-lateral-raise').warning,
  '减重',
  'v3 侧平举必须包含失控减重提示',
);
assertIncludes(
  getRequiredExercise(versionThreeUpperA, 'bent-over-reverse-fly').warning,
  '腰背',
  'v3 反向飞鸟必须包含腰背安全提示',
);
assertIncludes(
  getRequiredExercise(versionThreeUpperA, 'power-bar-bend').warning,
  '失控回弹',
  'v3 臂力棒必须保留防回弹提示',
);

const versionThreeUpperB = getWorkoutTemplate('upper-b');
assertArrayEqual(
  versionThreeUpperB.exercises.map((exercise) => exercise.id),
  [
    'push-up',
    'neutral-grip-floor-press',
    'dumbbell-pullover',
    'wide-elbow-dumbbell-row',
    'dumbbell-hammer-curl',
    'power-bar-bend',
  ],
  'v3 上肢 B 应按居家推拉与手臂顺序排列',
);
const pushUp = getRequiredExercise(versionThreeUpperB, 'push-up');
assertEqual(pushUp.equipment, 'bodyweight', '俯卧撑应记录为自重动作');
assertEqual(pushUp.sets, 3, '俯卧撑应训练 3 组');
assertEqual(pushUp.repMin, 8, '俯卧撑最低应为 8 次');
assertEqual(pushUp.repMax, 20, '俯卧撑最高应为 20 次');
const hammerCurl = getRequiredExercise(versionThreeUpperB, 'dumbbell-hammer-curl');
assertEqual(hammerCurl.equipment, 'dumbbell', '锤式弯举应记录哑铃重量');
assertEqual(hammerCurl.sets, 3, '锤式弯举应训练 3 组');
assertEqual(hammerCurl.repMin, 10, '锤式弯举最低应为 10 次');
assertEqual(hammerCurl.repMax, 15, '锤式弯举最高应为 15 次');
assertEqual(
  getRequiredExercise(versionThreeUpperB, 'dumbbell-pullover').name,
  '屈臂哑铃地板上拉',
  'v3 上肢 B 应使用地板上拉',
);
assertEqual(
  getRequiredExercise(versionThreeUpperB, 'wide-elbow-dumbbell-row').name,
  '扶椅宽肘单臂哑铃划船',
  'v3 上肢 B 应明确扶椅宽肘划船',
);

const versionThreeLowerA = getWorkoutTemplate('lower-a');
assertEqual(
  versionThreeLowerA.exercises.every((exercise) => exercise.tip.includes('地面')),
  true,
  'v3 下肢 A 每个动作都应明确在地面完成',
);

const versionThreeLowerB = getWorkoutTemplate('lower-b');
const elevatedSplitSquat = getRequiredExercise(
  versionThreeLowerB,
  'rear-foot-elevated-split-squat',
);
assertIncludes(elevatedSplitSquat.tip, '靠墙', '后脚抬高分腿蹲应要求椅子靠墙');
assertIncludes(elevatedSplitSquat.tip, '防滑', '后脚抬高分腿蹲应要求椅子防滑');
assertIncludes(
  elevatedSplitSquat.warning,
  '原地哑铃分腿蹲',
  '椅子不安全时应提供原地分腿蹲回退',
);
const standingCalfRaise = getRequiredExercise(versionThreeLowerB, 'standing-calf-raise');
assertEqual(standingCalfRaise.name, '扶椅站姿哑铃提踵', 'v3 提踵应明确扶椅完成');
assertIncludes(standingCalfRaise.tip, '靠墙', '提踵使用的椅子应要求靠墙');
assertIncludes(standingCalfRaise.tip, '防滑', '提踵使用的椅子应要求防滑');

const workoutKinds: WorkoutKind[] = ['upper-a', 'lower-a', 'upper-b', 'lower-b'];
for (const workoutKind of workoutKinds) {
  const currentTemplate = getWorkoutTemplate(workoutKind);
  assertIncludes(currentTemplate.title, '居家', `${workoutKind} v3 标题应明确居家训练`);
  assertIncludes(currentTemplate.subtitle, '居家', `${workoutKind} v3 说明应明确居家训练`);
}

const retainedExerciseIdsByKind: Record<WorkoutKind, string[]> = {
  'upper-a': [
    'dumbbell-bench-press',
    'one-arm-dumbbell-row',
    'seated-dumbbell-press',
    'dumbbell-lateral-raise',
    'bent-over-reverse-fly',
    'power-bar-bend',
  ],
  'lower-a': [
    'goblet-squat',
    'dumbbell-romanian-deadlift',
    'reverse-lunge',
    'alternating-leg-lower',
    'forearm-plank',
  ],
  'upper-b': [
    'neutral-grip-floor-press',
    'dumbbell-pullover',
    'wide-elbow-dumbbell-row',
    'power-bar-bend',
  ],
  'lower-b': [
    'rear-foot-elevated-split-squat',
    'staggered-stance-romanian-deadlift',
    'dumbbell-glute-bridge',
    'standing-calf-raise',
    'dumbbell-weighted-crunch',
    'side-plank',
  ],
};

for (const workoutKind of workoutKinds) {
  const versionTwoTemplate = getWorkoutTemplate(workoutKind, 2);
  const versionThreeTemplate = getWorkoutTemplate(workoutKind, 3);
  for (const exerciseId of retainedExerciseIdsByKind[workoutKind]) {
    const versionTwoExercise = getRequiredExercise(versionTwoTemplate, exerciseId);
    const versionThreeExercise = getRequiredExercise(versionThreeTemplate, exerciseId);
    assertEqual(versionThreeExercise.sets, versionTwoExercise.sets, `${exerciseId} 组数不得跨版本变化`);
    assertEqual(
      versionThreeExercise.repMin,
      versionTwoExercise.repMin,
      `${exerciseId} 最低次数不得跨版本变化`,
    );
    assertEqual(
      versionThreeExercise.repMax,
      versionTwoExercise.repMax,
      `${exerciseId} 最高次数不得跨版本变化`,
    );
  }
}

assertArrayEqual(
  getWorkoutTemplate('upper-b', 999).exercises.map((exercise) => exercise.id),
  versionThreeUpperB.exercises.map((exercise) => exercise.id),
  '未知模板版本应回退当前 v3',
);

const hasUnclassifiedExercise = workoutTemplates.some((template) =>
  template.exercises.some((exercise) => !['strength', 'core'].includes(exercise.section)),
);
assertEqual(hasUnclassifiedExercise, false, 'v3 所有动作都必须归入训练分组');
