import {
  exerciseGuideSafetyNotice,
  exerciseMediaKeys,
  getCurrentExerciseGuides,
  getExerciseGuide,
} from './exerciseGuides';
import { CURRENT_WORKOUT_TEMPLATE_VERSION, workoutTemplates } from './workoutPlan';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const guides = getCurrentExerciseGuides();
const guideIds = guides.map((guide) => guide.id);
const currentExercisesById = new Map(
  workoutTemplates.flatMap((template) => template.exercises.map((exercise) => [exercise.id, exercise] as const)),
);

assert(CURRENT_WORKOUT_TEMPLATE_VERSION === 3, '动作资料当前必须绑定训练模板 v3');
assert(new Set(guideIds).size === guideIds.length, '动作资料 ID 必须唯一');
assert(guides.length === currentExercisesById.size, '每个当前唯一动作都必须有一份动作资料');
assert(new Set(exerciseMediaKeys).size === exerciseMediaKeys.length, '媒体键必须唯一');
assert(guides.filter((guide) => guide.mediaKey).length === 13, '首批只允许打包 13 组已审核媒体');
assert(
  ['关节锐痛', '麻木', '眩晕', '器材松动', '立即停止'].every((phrase) =>
    exerciseGuideSafetyNotice.includes(phrase),
  ),
  '动作资料必须保留完整的全局停止规则',
);

const expectedNoMediaIds = [
  'alternating-leg-lower',
  'bent-over-reverse-fly',
  'dumbbell-bench-press',
  'dumbbell-pullover',
  'dumbbell-weighted-crunch',
  'forearm-plank',
  'neutral-grip-floor-press',
  'power-bar-bend',
  'staggered-stance-romanian-deadlift',
];
const actualNoMediaIds = guides.filter((guide) => !guide.mediaKey).map((guide) => guide.id).sort();
assert(
  actualNoMediaIds.join(',') === expectedNoMediaIds.sort().join(','),
  '训练凳或动作不一致的媒体必须保持禁用',
);

const mappedMediaKeys = guides.flatMap((guide) => (guide.mediaKey ? [guide.mediaKey] : []));
assert(new Set(mappedMediaKeys).size === mappedMediaKeys.length, '一个媒体键只能映射到一个当前动作');

for (const [exerciseId, exercise] of currentExercisesById) {
  const guide = getExerciseGuide(exerciseId, CURRENT_WORKOUT_TEMPLATE_VERSION);
  assert(guide, `当前动作缺少资料：${exerciseId}`);
  assert(guide.name === exercise.name, `${exerciseId} 的资料名称必须与 v3 模板一致`);
}

assert(getExerciseGuide('dumbbell-bench-press', 1) === undefined, 'v1 不得错误使用 v3 地板卧推资料');
assert(getExerciseGuide('dumbbell-pullover', 2) === undefined, 'v2 不得错误使用 v3 地板上拉资料');

for (const guide of guides) {
  assert(guide.homeSetup.length > 0, `${guide.name} 必须说明居家准备`);
  assert(guide.primaryMuscles.length > 0, `${guide.name} 必须说明主要肌群`);
  assert(guide.steps.length >= 4 && guide.steps.length <= 6, `${guide.name} 必须提供 4 至 6 个步骤`);
  assert(guide.commonMistakes.length >= 2, `${guide.name} 必须提供至少 2 个常见错误`);
  assert(guide.stopConditions.length >= 1, `${guide.name} 必须提供停止条件`);
  assert(
    [guide.alternatives.easier, guide.alternatives.sameLevel, guide.alternatives.harder].every(
      (alternative) => alternative.trim().length > 0,
    ),
    `${guide.name} 必须提供完整的难度调整`,
  );

  const homeInstructionText = [
    guide.homeSetup,
    ...guide.steps,
    ...guide.commonMistakes,
    ...guide.stopConditions,
    guide.alternatives.easier,
    guide.alternatives.sameLevel,
    guide.alternatives.harder,
  ].join(' ');
  for (const prohibitedEquipment of ['训练凳', '健身凳', '健身球', '单杠', '双杠', '弹力带', '史密斯机']) {
    assert(
      !homeInstructionText.includes(prohibitedEquipment),
      `${guide.name} 的居家步骤不得要求 ${prohibitedEquipment}`,
    );
  }

  if (guide.mediaKey) {
    assert(exerciseMediaKeys.includes(guide.mediaKey), `${guide.name} 使用了未登记媒体`);
    assert(Boolean(guide.mediaMatch), `${guide.name} 必须标记媒体匹配程度`);
    assert(/^\d{4}$/.test(guide.sourceExerciseId ?? ''), `${guide.name} 必须记录四位数据集 ID`);
    assert(Boolean(guide.sourceExerciseName), `${guide.name} 必须记录数据集动作名称`);
    assert(
      guide.mediaKey.startsWith(`${guide.sourceExerciseId}-`),
      `${guide.name} 的媒体键必须与数据集 ID 一致`,
    );
    if (guide.mediaMatch === 'adapted') {
      assert(Boolean(guide.mediaNote), `${guide.name} 的近似媒体必须说明差异`);
    }
  } else {
    assert(Boolean(guide.mediaUnavailableReason), `${guide.name} 无媒体时必须解释原因`);
  }
}
