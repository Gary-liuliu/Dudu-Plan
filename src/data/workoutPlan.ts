import type { WorkoutKind, WorkoutTemplate } from '../types';

export const CURRENT_WORKOUT_TEMPLATE_VERSION = 3;

const workoutTemplatesV1: WorkoutTemplate[] = [
  {
    kind: 'upper-a',
    title: '上肢 A · 胸背基础',
    shortTitle: '上肢 A',
    subtitle: '稳定推拉，补足肩部中束与后束',
    accent: '#FF4D8D',
    exercises: [
      {
        id: 'dumbbell-bench-press',
        section: 'strength',
        name: '哑铃平卧推举',
        focus: '胸肌、肱三头肌',
        sets: 4,
        repMin: 8,
        repMax: 12,
        repUnit: '次',
        restSeconds: 120,
        equipment: 'dumbbell',
        tip: '肩胛保持稳定，选择还能完成约 2 次的重量。',
        warning: '重量失控时直接减重，不用单手交替作为替代。',
      },
      {
        id: 'one-arm-dumbbell-row',
        section: 'strength',
        name: '单臂哑铃划船',
        focus: '背阔肌、中上背',
        sets: 4,
        repMin: 8,
        repMax: 12,
        repUnit: '次',
        restSeconds: 120,
        equipment: 'dumbbell',
        isPerSide: true,
        tip: '躯干保持稳定，肘部向髋部方向拉动。',
      },
      {
        id: 'seated-dumbbell-press',
        section: 'strength',
        name: '坐姿哑铃推举',
        focus: '三角肌前束、中束',
        sets: 3,
        repMin: 8,
        repMax: 12,
        repUnit: '次',
        restSeconds: 120,
        equipment: 'dumbbell',
        tip: '收紧核心，避免肋骨外翻和腰部过度反弓。',
      },
      {
        id: 'dumbbell-lateral-raise',
        section: 'strength',
        name: '哑铃侧平举',
        focus: '三角肌中束',
        sets: 3,
        repMin: 12,
        repMax: 20,
        repUnit: '次',
        restSeconds: 75,
        equipment: 'dumbbell',
        tip: '使用轻重量控制下放，肩膀保持远离耳朵。',
      },
      {
        id: 'bent-over-reverse-fly',
        section: 'strength',
        name: '俯身哑铃反向飞鸟',
        focus: '三角肌后束、上背',
        sets: 3,
        repMin: 12,
        repMax: 20,
        repUnit: '次',
        restSeconds: 75,
        equipment: 'dumbbell',
        tip: '保持脊柱中立，用肩后侧展开手臂。',
      },
      {
        id: 'power-bar-bend',
        section: 'strength',
        name: '臂力棒弯压',
        focus: '胸肌、前三角、手臂',
        sets: 2,
        repMin: 10,
        repMax: 15,
        repUnit: '次',
        restSeconds: 90,
        equipment: 'power-bar',
        tip: '全程缓慢可控，结束时保留 1-2 次余力。',
        warning: '检查弹簧与握把，远离面部，禁止失控回弹。',
      },
    ],
  },
  {
    kind: 'lower-a',
    title: '下肢 A · 深蹲与核心',
    shortTitle: '下肢 A',
    subtitle: '膝主导训练，建立躯干稳定',
    accent: '#7C5CFC',
    exercises: [
      {
        id: 'goblet-squat',
        section: 'strength',
        name: '哑铃高脚杯深蹲',
        focus: '股四头肌、臀肌',
        sets: 4,
        repMin: 10,
        repMax: 15,
        repUnit: '次',
        restSeconds: 120,
        equipment: 'dumbbell',
        tip: '膝盖与脚尖方向一致，在稳定范围内下蹲。',
      },
      {
        id: 'dumbbell-romanian-deadlift',
        section: 'strength',
        name: '哑铃罗马尼亚硬拉',
        focus: '臀肌、大腿后侧',
        sets: 4,
        repMin: 8,
        repMax: 12,
        repUnit: '次',
        restSeconds: 150,
        equipment: 'dumbbell',
        tip: '髋部后移，哑铃贴腿，到大腿后侧明显拉伸即可。',
        warning: '腰背保持中立，不用弯腰幅度换取下放距离。',
      },
      {
        id: 'reverse-lunge',
        section: 'strength',
        name: '哑铃反向箭步蹲',
        focus: '股四头肌、臀肌、单侧稳定',
        sets: 3,
        repMin: 8,
        repMax: 12,
        repUnit: '次',
        restSeconds: 90,
        equipment: 'dumbbell',
        isPerSide: true,
        tip: '向后落步并保持前脚稳定，躯干自然直立。',
      },
      {
        id: 'alternating-leg-lower',
        section: 'core',
        name: '仰卧交替抬腿',
        focus: '腹直肌、髋屈肌控制',
        sets: 3,
        repMin: 10,
        repMax: 15,
        repUnit: '次',
        restSeconds: 60,
        equipment: 'bodyweight',
        isPerSide: true,
        tip: '保持骨盆后倾，腰部翘起时缩小动作幅度。',
        warning: '该动作强化核心，不能定点减少下腹脂肪。',
      },
      {
        id: 'forearm-plank',
        section: 'core',
        name: '平板支撑',
        focus: '核心抗伸展',
        sets: 3,
        repMin: 30,
        repMax: 60,
        repUnit: '秒',
        restSeconds: 60,
        equipment: 'bodyweight',
        tip: '收紧臀腹并保持自然呼吸，腰部不要下沉。',
      },
    ],
  },
  {
    kind: 'upper-b',
    title: '上肢 B · 肩背变化',
    shortTitle: '上肢 B',
    subtitle: '变化推拉角度，继续强化肩宽与背部厚度',
    accent: '#00BFA6',
    exercises: [
      {
        id: 'neutral-grip-floor-press',
        section: 'strength',
        name: '中立握哑铃地板卧推',
        focus: '胸肌、肱三头肌',
        sets: 4,
        repMin: 8,
        repMax: 12,
        repUnit: '次',
        restSeconds: 120,
        equipment: 'dumbbell',
        tip: '上臂轻触地面即推起，手腕保持中立。',
      },
      {
        id: 'dumbbell-pullover',
        section: 'strength',
        name: '哑铃仰卧上拉',
        focus: '背阔肌、胸肌',
        sets: 3,
        repMin: 10,
        repMax: 15,
        repUnit: '次',
        restSeconds: 90,
        equipment: 'dumbbell',
        tip: '肋骨保持稳定，在肩部舒适范围内向后下放。',
      },
      {
        id: 'wide-elbow-dumbbell-row',
        section: 'strength',
        name: '宽肘单臂哑铃划船',
        focus: '中上背、三角肌后束',
        sets: 3,
        repMin: 10,
        repMax: 15,
        repUnit: '次',
        restSeconds: 90,
        equipment: 'dumbbell',
        isPerSide: true,
        tip: '肘部斜向外拉，避免耸肩和躯干扭转。',
      },
      {
        id: 'seated-dumbbell-press',
        section: 'strength',
        name: '坐姿哑铃推举',
        focus: '三角肌前束、中束',
        sets: 3,
        repMin: 8,
        repMax: 12,
        repUnit: '次',
        restSeconds: 120,
        equipment: 'dumbbell',
        tip: '收紧核心，避免肋骨外翻和腰部过度反弓。',
      },
      {
        id: 'dumbbell-lateral-raise',
        section: 'strength',
        name: '哑铃侧平举',
        focus: '三角肌中束',
        sets: 3,
        repMin: 12,
        repMax: 20,
        repUnit: '次',
        restSeconds: 75,
        equipment: 'dumbbell',
        tip: '使用轻重量控制下放，肩膀保持远离耳朵。',
      },
      {
        id: 'power-bar-bend',
        section: 'strength',
        name: '臂力棒弯压',
        focus: '胸肌、前三角、手臂',
        sets: 2,
        repMin: 10,
        repMax: 15,
        repUnit: '次',
        restSeconds: 90,
        equipment: 'power-bar',
        tip: '全程缓慢可控，结束时保留 1-2 次余力。',
        warning: '检查弹簧与握把，远离面部，禁止失控回弹。',
      },
    ],
  },
  {
    kind: 'lower-b',
    title: '下肢 B · 单侧与后链',
    shortTitle: '下肢 B',
    subtitle: '强化臀腿后侧，训练侧向核心稳定',
    accent: '#FF9F1C',
    exercises: [
      {
        id: 'rear-foot-elevated-split-squat',
        section: 'strength',
        name: '后脚抬高分腿蹲',
        focus: '股四头肌、臀肌、单侧稳定',
        sets: 4,
        repMin: 8,
        repMax: 12,
        repUnit: '次',
        restSeconds: 120,
        equipment: 'dumbbell',
        isPerSide: true,
        tip: '使用稳固支撑，前脚位置以膝髋舒适为准。',
      },
      {
        id: 'staggered-stance-romanian-deadlift',
        section: 'strength',
        name: '错步哑铃罗马尼亚硬拉',
        focus: '臀肌、大腿后侧、单侧稳定',
        sets: 3,
        repMin: 10,
        repMax: 12,
        repUnit: '次',
        restSeconds: 120,
        equipment: 'dumbbell',
        isPerSide: true,
        tip: '后脚只辅助平衡，重心主要放在前脚。',
      },
      {
        id: 'dumbbell-glute-bridge',
        section: 'strength',
        name: '哑铃臀桥',
        focus: '臀肌、髋伸展',
        sets: 3,
        repMin: 10,
        repMax: 15,
        repUnit: '次',
        restSeconds: 90,
        equipment: 'dumbbell',
        tip: '顶端收紧臀部，避免用腰部过度反弓。',
      },
      {
        id: 'standing-calf-raise',
        section: 'strength',
        name: '站姿哑铃提踵',
        focus: '小腿后侧',
        sets: 3,
        repMin: 12,
        repMax: 20,
        repUnit: '次',
        restSeconds: 60,
        equipment: 'dumbbell',
        tip: '扶稳后完整抬起和下放，避免借助弹跳。',
      },
      {
        id: 'dead-bug',
        section: 'core',
        name: '死虫式',
        focus: '核心抗伸展、躯干控制',
        sets: 3,
        repMin: 8,
        repMax: 12,
        repUnit: '次',
        restSeconds: 60,
        equipment: 'bodyweight',
        isPerSide: true,
        tip: '腰背贴稳地面，手脚伸展到仍能控制的位置。',
      },
      {
        id: 'side-plank',
        section: 'core',
        name: '侧平板支撑',
        focus: '侧向核心稳定',
        sets: 3,
        repMin: 20,
        repMax: 45,
        repUnit: '秒',
        restSeconds: 60,
        equipment: 'bodyweight',
        isPerSide: true,
        tip: '头、肩、髋保持一线，髋部不要下沉。',
        warning: '该动作强化核心，不能定点减少腰侧脂肪。',
      },
    ],
  },
];

const workoutTemplatesV2: WorkoutTemplate[] = workoutTemplatesV1.map((template) => ({
  ...template,
  exercises: template.exercises.map((exercise) => {
    if (template.kind === 'lower-a' && exercise.id === 'forearm-plank') {
      return { ...exercise, repMin: 45 };
    }

    if (template.kind !== 'lower-b' || exercise.id !== 'dead-bug') {
      return { ...exercise };
    }

    return {
      id: 'dumbbell-weighted-crunch',
      section: 'core',
      name: '哑铃负重卷腹',
      focus: '腹直肌、躯干屈曲控制',
      sets: 3,
      repMin: 10,
      repMax: 15,
      repUnit: '次',
      restSeconds: 60,
      equipment: 'dumbbell',
      tip: '哑铃贴近胸前，肋骨向骨盆靠拢，缓慢卷起和下放。',
      warning: '重量按单只哑铃记录；腰部不适时减重或改为徒手卷腹。',
    };
  }),
}));

function getRequiredExercise(template: WorkoutTemplate, exerciseId: string) {
  const exercise = template.exercises.find((candidate) => candidate.id === exerciseId);
  if (!exercise) {
    throw new Error(`Missing exercise ${exerciseId} in ${template.kind}.`);
  }
  return exercise;
}

// Retained exercise IDs and loading ranges stay fixed so cross-version progression remains continuous.
const workoutTemplatesV3: WorkoutTemplate[] = workoutTemplatesV2.map((template) => {
  if (template.kind === 'upper-a') {
    return {
      ...template,
      title: '上肢 A · 居家胸背基础',
      subtitle: '居家地板推举与扶椅划船，兼顾肩部和手臂',
      exercises: template.exercises.map((exercise) => {
        switch (exercise.id) {
          case 'dumbbell-bench-press':
            return {
              ...exercise,
              name: '标准握哑铃地板卧推',
              tip: '仰卧地面并屈膝踩稳，肩胛下沉后收，上臂轻触地面后平稳推起。',
              warning: '肘部与躯干保持约 30-45°；普通椅不能代替卧推凳。',
            };
          case 'one-arm-dumbbell-row':
            return {
              ...exercise,
              name: '扶椅单臂哑铃划船',
              tip: '稳固椅背靠墙，一手轻扶并保持双脚着地，肘部向髋部方向拉动。',
              warning: '椅子不稳时改为扶墙分腿站姿，避免扭腰或耸肩借力。',
            };
          case 'seated-dumbbell-press':
            return {
              ...exercise,
              name: '普通椅坐姿哑铃推举',
              tip: '坐在稳固普通椅前半部，双脚踩稳并收紧臀腹，在无痛范围内推举。',
              warning: '不依赖椅背承重，肋骨保持下压，腰部不得明显后仰。',
            };
          case 'dumbbell-lateral-raise':
            return {
              ...exercise,
              tip: '在空旷防滑地面使用轻重量，肩膀远离耳朵并缓慢控制下放。',
              warning: '无法控制或需要甩动时立即减重，手臂不必抬过肩高。',
            };
          case 'bent-over-reverse-fly':
            return {
              ...exercise,
              tip: '站在防滑地面屈髋俯身，保持脊柱中立，用肩后侧展开手臂。',
              warning: '使用可稳定停住的轻重量，腰背疲劳时停止而不是加大弯腰幅度。',
            };
          case 'power-bar-bend':
            return {
              ...exercise,
              tip: '在空旷区域缓慢弯压并控制回程，结束时保留 1-2 次余力。',
              warning: '训练前检查弹簧与握把，远离面部和他人，禁止失控回弹。',
            };
          default:
            return { ...exercise };
        }
      }),
    };
  }

  if (template.kind === 'lower-a') {
    return {
      ...template,
      title: '下肢 A · 居家深蹲与核心',
      subtitle: '居家哑铃与地面动作，建立腿部力量和躯干稳定',
      exercises: template.exercises.map((exercise) => {
        switch (exercise.id) {
          case 'goblet-squat':
            return {
              ...exercise,
              tip: '双脚站在平整防滑地面，膝盖与脚尖方向一致，在稳定范围内下蹲。',
            };
          case 'dumbbell-romanian-deadlift':
            return {
              ...exercise,
              tip: '站稳在平整地面，髋部后移并让哑铃贴腿，到大腿后侧明显拉伸即可。',
            };
          case 'reverse-lunge':
            return {
              ...exercise,
              tip: '在空旷防滑地面向后落步，前脚全掌踩稳并保持躯干自然直立。',
            };
          case 'alternating-leg-lower':
            return {
              ...exercise,
              tip: '仰卧地面并保持骨盆后倾，腰部翘起时缩小腿部下放幅度。',
            };
          case 'forearm-plank':
            return {
              ...exercise,
              tip: '前臂撑在平整地面，收紧臀腹并自然呼吸，腰部不要下沉。',
            };
          default:
            return { ...exercise };
        }
      }),
    };
  }

  if (template.kind === 'upper-b') {
    const neutralGripFloorPress = getRequiredExercise(template, 'neutral-grip-floor-press');
    const dumbbellPullover = getRequiredExercise(template, 'dumbbell-pullover');
    const wideElbowDumbbellRow = getRequiredExercise(template, 'wide-elbow-dumbbell-row');
    const powerBarBend = getRequiredExercise(template, 'power-bar-bend');

    return {
      ...template,
      title: '上肢 B · 居家胸背手臂',
      subtitle: '居家俯卧撑、地板推拉与手臂训练，无需健身凳',
      exercises: [
        {
          id: 'push-up',
          section: 'strength',
          name: '俯卧撑',
          focus: '胸肌、肱三头肌、三角肌前束',
          sets: 3,
          repMin: 8,
          repMax: 20,
          repUnit: '次',
          restSeconds: 90,
          equipment: 'bodyweight',
          tip: '双手撑在防滑地面，身体保持一线，肘部斜向后约 30-45°并控制下放。',
          warning: '无法保持躯干稳定时减少次数，不要用塌腰或耸肩换取动作幅度。',
        },
        {
          ...neutralGripFloorPress,
          tip: '仰卧地面并屈膝踩稳，掌心相对，上臂轻触地面后平稳推起。',
          warning: '肩胛保持稳定，臀部不离地，不用普通椅或拼接椅子增加行程。',
        },
        {
          ...dumbbellPullover,
          name: '屈臂哑铃地板上拉',
          tip: '仰卧地面并收紧肋骨，两手托住一只哑铃，保持屈肘角度缓慢向头后下放。',
          warning: '上臂接近地面或肩部达到舒适极限即返回，不追求越过地面的深拉伸。',
        },
        {
          ...wideElbowDumbbellRow,
          name: '扶椅宽肘单臂哑铃划船',
          tip: '稳固椅背靠墙，一手轻扶，肘部斜向外拉向下胸侧并保持躯干稳定。',
          warning: '椅子不稳时改为扶墙分腿站姿，避免耸肩和躯干扭转。',
        },
        {
          id: 'dumbbell-hammer-curl',
          section: 'strength',
          name: '哑铃锤式弯举',
          focus: '肱肌、肱二头肌、前臂',
          sets: 3,
          repMin: 10,
          repMax: 15,
          repUnit: '次',
          restSeconds: 75,
          equipment: 'dumbbell',
          tip: '站在防滑地面并保持掌心相对，肘部贴近身体，完整抬起后缓慢下放。',
          warning: '身体开始后仰或甩动时立即减重，不用肩部摆动完成次数。',
        },
        {
          ...powerBarBend,
          tip: '在空旷区域缓慢弯压并控制回程，结束时保留 1-2 次余力。',
          warning: '训练前检查弹簧与握把，远离面部和他人，禁止失控回弹。',
        },
      ],
    };
  }

  return {
    ...template,
    title: '下肢 B · 居家单侧与后链',
    subtitle: '居家稳固椅辅助单侧训练，强化臀腿后侧与核心',
    exercises: template.exercises.map((exercise) => {
      switch (exercise.id) {
        case 'rear-foot-elevated-split-squat':
          return {
            ...exercise,
            name: '稳固椅后脚抬高分腿蹲',
            tip: '使用无轮且背靠墙的防滑稳固椅，后脚轻放，主要重量保持在前脚。',
            warning: '椅子会滑、松动或高度不合适时，改做双脚都在地面的原地哑铃分腿蹲。',
          };
        case 'staggered-stance-romanian-deadlift':
          return {
            ...exercise,
            tip: '在平整防滑地面采用错步站姿，后脚只辅助平衡，重心主要放在前脚。',
          };
        case 'dumbbell-glute-bridge':
          return {
            ...exercise,
            tip: '仰卧地面并将哑铃稳放髋部，顶端收紧臀部，避免腰部过度反弓。',
          };
        case 'standing-calf-raise':
          return {
            ...exercise,
            name: '扶椅站姿哑铃提踵',
            tip: '稳固椅背靠墙并放在防滑地面，一手轻扶，完整抬起脚跟后缓慢下放。',
            warning: '椅子只用于平衡，不在台阶边缘训练，也不要借助弹跳完成次数。',
          };
        case 'dumbbell-weighted-crunch':
          return {
            ...exercise,
            tip: '仰卧地面并将哑铃贴近胸前，肋骨向骨盆靠拢，缓慢卷起和下放。',
          };
        case 'side-plank':
          return {
            ...exercise,
            tip: '前臂撑在平整地面，头、肩、髋保持一线，髋部不要下沉。',
          };
        default:
          return { ...exercise };
      }
    }),
  };
});

export const workoutTemplates = workoutTemplatesV3;

export const workoutTemplatesByKind = Object.fromEntries(
  workoutTemplates.map((template) => [template.kind, template]),
) as Record<WorkoutKind, WorkoutTemplate>;

const workoutTemplatesV1ByKind = Object.fromEntries(
  workoutTemplatesV1.map((template) => [template.kind, template]),
) as Record<WorkoutKind, WorkoutTemplate>;

const workoutTemplatesV2ByKind = Object.fromEntries(
  workoutTemplatesV2.map((template) => [template.kind, template]),
) as Record<WorkoutKind, WorkoutTemplate>;

export function getWorkoutTemplate(
  kind: WorkoutKind,
  version = CURRENT_WORKOUT_TEMPLATE_VERSION,
): WorkoutTemplate {
  if (version === 1) {
    return workoutTemplatesV1ByKind[kind];
  }
  if (version === 2) {
    return workoutTemplatesV2ByKind[kind];
  }
  return workoutTemplatesByKind[kind];
}
