export type ExerciseMediaMatch = 'exact' | 'adapted';

export type ExerciseMediaKey =
  | '0292-C0MA9bC'
  | '0405-znQUdHY'
  | '0334-DsgkuIt'
  | '1760-yn8yg1r'
  | '1459-rR0LJzx'
  | '0381-SSsBDwB'
  | '0662-I4hDWkc'
  | '0377-EKXOMEh'
  | '0313-slDvUAU'
  | '0410-qx4fgX7'
  | '3013-u0cNiij'
  | '1373-bJYHBIN'
  | '0705-RKjH6Lt';

export interface ExerciseAlternatives {
  easier: string;
  sameLevel: string;
  harder: string;
}

export interface ExerciseGuide {
  id: string;
  name: string;
  homeSetup: string;
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
  steps: readonly string[];
  commonMistakes: readonly string[];
  stopConditions: readonly string[];
  alternatives: ExerciseAlternatives;
  mediaKey?: ExerciseMediaKey;
  mediaMatch?: ExerciseMediaMatch;
  mediaNote?: string;
  sourceExerciseId?: string;
  sourceExerciseName?: string;
  mediaUnavailableReason?: string;
}

export const exerciseMediaKeys: readonly ExerciseMediaKey[] = [
  '0292-C0MA9bC',
  '0405-znQUdHY',
  '0334-DsgkuIt',
  '1760-yn8yg1r',
  '1459-rR0LJzx',
  '0381-SSsBDwB',
  '0662-I4hDWkc',
  '0377-EKXOMEh',
  '0313-slDvUAU',
  '0410-qx4fgX7',
  '3013-u0cNiij',
  '1373-bJYHBIN',
  '0705-RKjH6Lt',
];

export const exerciseGuideSafetyNotice =
  '出现关节锐痛、麻木、眩晕、器材松动或无法控制动作时立即停止；普通肌肉发力和疲劳感不等同于关节疼痛。';

const currentExerciseGuides: readonly ExerciseGuide[] = [
  {
    id: 'dumbbell-bench-press',
    name: '标准握哑铃地板卧推',
    homeSetup: '防滑地面或训练垫、同重量哑铃一对；先坐地将哑铃放在大腿上，再受控后躺。',
    primaryMuscles: ['胸肌'],
    secondaryMuscles: ['肱三头肌', '三角肌前束'],
    steps: [
      '仰卧屈膝，双脚全掌踩地，肩胛向下后收。',
      '哑铃置于胸部两侧，掌心朝脚，手腕位于肘部正上方。',
      '吸气下放，肘部与躯干保持约 30-45°。',
      '上臂轻触地面后停住，不借地面反弹。',
      '呼气平稳推起，顶端不让哑铃猛烈碰撞。',
      '结束时先收回胸侧，侧滚坐起后再将哑铃放地。',
    ],
    commonMistakes: ['肘部横向张开接近 90°。', '手腕后折，或上臂撞地反弹。', '抬起臀部、耸肩或用腰部制造行程。'],
    stopConditions: ['肩、肘或手腕出现锐痛、卡压或麻木。', '无法控制下放，或无法安全坐起放下哑铃。'],
    alternatives: {
      easier: '墙壁俯卧撑，或明显减轻哑铃重量。',
      sameLevel: '中立握哑铃地板卧推。',
      harder: '同重量下放 3 秒，并在上臂触地后停顿 1 秒。',
    },
    mediaUnavailableReason: '数据集只有训练凳卧推，肘部会低于躯干，与地板限幅动作不同，避免误导。',
  },
  {
    id: 'one-arm-dumbbell-row',
    name: '扶椅单臂哑铃划船',
    homeSetup: '无轮稳固椅背靠墙，一只哑铃；椅子只用于手部轻扶，双脚始终留在地面。',
    primaryMuscles: ['背阔肌', '中上背'],
    secondaryMuscles: ['肱二头肌', '前臂'],
    steps: [
      '一手扶稳椅背，两脚前后站立，髋部向后移动。',
      '保持脊柱中立，持铃手自然垂向地面。',
      '先让肩胛保持稳定，再将肘部拉向髋部。',
      '顶端短暂停顿，躯干保持朝向地面。',
      '缓慢伸直手臂，完成一侧后再换边。',
    ],
    commonMistakes: ['扭转躯干把哑铃甩到高处。', '耸肩，或只用手臂弯举重量。', '把过多体重压在不稳的椅子上。'],
    stopConditions: ['椅子移动、翘起或发出结构松动声。', '腰背、肩部出现锐痛或手臂麻木。'],
    alternatives: {
      easier: '减轻重量并改为扶墙分腿站姿单臂划船。',
      sameLevel: '双手哑铃俯身划船。',
      harder: '保持重量，在顶端停顿 2 秒后缓慢下放。',
    },
    mediaKey: '0292-C0MA9bC',
    mediaMatch: 'adapted',
    mediaNote: '动画使用训练凳支撑；居家执行时只用靠墙稳固椅轻扶，双脚均留在地面。',
    sourceExerciseId: '0292',
    sourceExerciseName: 'dumbbell one arm bent-over row',
  },
  {
    id: 'seated-dumbbell-press',
    name: '普通椅坐姿哑铃推举',
    homeSetup: '无轮稳固椅背靠墙、同重量哑铃一对；坐在椅面前半部，不依靠椅背承重。',
    primaryMuscles: ['三角肌前束', '三角肌中束'],
    secondaryMuscles: ['肱三头肌', '上背'],
    steps: [
      '双脚全掌踩地，臀腹收紧，肋骨保持下压。',
      '将哑铃举到肩部两侧，手腕叠在肘部上方。',
      '呼气向上推举，手臂沿舒适路线略向内移动。',
      '顶端保持躯干稳定，不用力撞击哑铃。',
      '吸气缓慢下放至肩部附近，保持前臂基本垂直。',
    ],
    commonMistakes: ['腰部明显后仰，用反弓代替肩部活动。', '耸肩，或将肘部降得过低。', '借助腿部蹬地和身体弹动推起。'],
    stopConditions: ['椅子移动、松动或无法保持稳定坐姿。', '肩部卡压、颈部不适或腰部疼痛。'],
    alternatives: {
      easier: '减轻重量并采用掌心相对的中立握坐姿推举。',
      sameLevel: '左右交替单臂普通椅坐姿哑铃推举。',
      harder: '站姿哑铃推举，前提是全程不后仰。',
    },
    mediaKey: '0405-znQUdHY',
    mediaMatch: 'adapted',
    mediaNote: '动画使用训练凳；居家使用无轮、靠墙的稳固普通椅，不依赖椅背承重。',
    sourceExerciseId: '0405',
    sourceExerciseName: 'dumbbell seated shoulder press',
  },
  {
    id: 'dumbbell-lateral-raise',
    name: '哑铃侧平举',
    homeSetup: '空旷防滑地面、轻重量哑铃一对；手臂两侧需留有完整展开空间。',
    primaryMuscles: ['三角肌中束'],
    secondaryMuscles: ['斜方肌', '肩袖'],
    steps: [
      '双脚站稳，膝盖微屈，臀腹保持轻度收紧。',
      '哑铃置于身体两侧，肘部保持轻微弯曲。',
      '手臂沿身体前方约 20-30°的方向抬起。',
      '抬至接近肩高或无痛上限后短暂停顿。',
      '缓慢下放，肩膀始终远离耳朵。',
    ],
    commonMistakes: ['甩动躯干或耸肩带起重量。', '重量过大，手臂失控下落。', '强行抬过肩高或刻意让拇指朝下。'],
    stopConditions: ['肩部出现锐痛、明显夹挤感或手臂麻木。', '必须摆动身体才能继续完成次数。'],
    alternatives: {
      easier: '单臂扶墙侧平举，并减轻重量。',
      sameLevel: '屈肘哑铃侧平举。',
      harder: '同重量顶端停顿 1-2 秒并用 3 秒下放。',
    },
    mediaKey: '0334-DsgkuIt',
    mediaMatch: 'exact',
    sourceExerciseId: '0334',
    sourceExerciseName: 'dumbbell lateral raise',
  },
  {
    id: 'bent-over-reverse-fly',
    name: '俯身哑铃反向飞鸟',
    homeSetup: '防滑地面、轻重量哑铃一对；前后左右保留手臂展开空间。',
    primaryMuscles: ['三角肌后束'],
    secondaryMuscles: ['斜方肌', '菱形肌'],
    steps: [
      '双脚站稳，膝盖微屈，髋部向后做俯身姿势。',
      '脊柱保持中立，双臂自然下垂，掌心相对。',
      '保持肘部微屈，用肩后侧将手臂向两侧展开。',
      '手臂接近躯干高度后停住并轻收肩胛。',
      '缓慢回到起始位置，不改变俯身角度。',
    ],
    commonMistakes: ['用耸肩和甩臂完成动作。', '为了抬得更高而过度反弓腰背。', '把动作做成肘部大幅弯曲的划船。'],
    stopConditions: ['腰背无法继续保持中立或出现锐痛。', '肩部卡压、手臂麻木或重量开始失控。'],
    alternatives: {
      easier: '单手扶墙、另一手完成轻重量反向飞鸟。',
      sameLevel: '扶椅宽肘单臂哑铃划船。',
      harder: '同重量在展开顶端停顿 2 秒。',
    },
    mediaUnavailableReason: '数据集候选实际使用坐姿或上斜凳胸部支撑，与站姿屈髋版本不同。',
  },
  {
    id: 'power-bar-bend',
    name: '臂力棒弯压',
    homeSetup: '空旷区域、阻力适合且无裂纹变形的臂力棒；按器材标示方向持握，远离面部和他人。',
    primaryMuscles: ['胸肌', '三角肌前束'],
    secondaryMuscles: ['肱二头肌', '肱三头肌', '前臂'],
    steps: [
      '训练前检查弹簧、连接处和两侧握把是否牢固防滑。',
      '双脚站稳，将臂力棒保持在胸前安全距离。',
      '收紧臀腹，呼气并以两侧均匀力量缓慢弯压。',
      '到可控制范围后停住，不强行压到极限。',
      '吸气缓慢控制回程，接近伸直时仍保持张力。',
      '保留 1-2 次余力，在回程开始失控前结束。',
    ],
    commonMistakes: ['靠近面部弯压或快速释放回弹。', '左右手发力明显不均。', '做到完全力竭后仍强行继续。'],
    stopConditions: ['弹簧变形、裂纹、连接处松动或握把打滑。', '肩、肘、手腕疼痛，或已经无法控制回程。'],
    alternatives: {
      easier: '轻哑铃窄握地板卧推。',
      sameLevel: '标准握哑铃地板卧推。',
      harder: '保持原阻力并放慢回程，不通过快速弯压增加难度。',
    },
    mediaUnavailableReason: '数据集中没有臂力棒或弹簧臂力器动作，避免用错误器材动画误导。',
  },
  {
    id: 'goblet-squat',
    name: '哑铃高脚杯深蹲',
    homeSetup: '平整防滑地面、一只哑铃；初学时可在身后放置背靠墙的稳固椅作为深度提示。',
    primaryMuscles: ['股四头肌', '臀肌'],
    secondaryMuscles: ['大腿后侧', '小腿'],
    steps: [
      '双手稳固托住哑铃并贴近胸前，双脚约与肩同宽。',
      '吸气收紧躯干，膝盖与脚尖保持同向。',
      '髋膝同时弯曲，身体在稳定范围内向下。',
      '保持全脚掌着地，到可控制深度后停住。',
      '呼气推动地面站起，顶端自然伸直髋膝。',
    ],
    commonMistakes: ['膝盖向内塌或脚跟离地。', '哑铃远离身体导致躯干前倒。', '为了追求深度而腰背卷曲。'],
    stopConditions: ['膝、髋或腰背出现锐痛。', '脚掌无法稳定着地或身体明显失去平衡。'],
    alternatives: {
      easier: '背靠墙稳固椅的徒手坐站。',
      sameLevel: '抱胸哑铃原地分腿蹲。',
      harder: '同重量底部停顿 2 秒高脚杯深蹲。',
    },
    mediaKey: '1760-yn8yg1r',
    mediaMatch: 'exact',
    sourceExerciseId: '1760',
    sourceExerciseName: 'dumbbell goblet squat',
  },
  {
    id: 'dumbbell-romanian-deadlift',
    name: '哑铃罗马尼亚硬拉',
    homeSetup: '平整防滑地面、同重量哑铃一对；身后留出髋部后移空间。',
    primaryMuscles: ['臀肌', '大腿后侧'],
    secondaryMuscles: ['下背', '握力'],
    steps: [
      '双脚约与髋同宽，哑铃置于大腿前侧。',
      '膝盖微屈，收紧躯干并保持脊柱中立。',
      '髋部向后移动，让哑铃沿大腿和小腿贴近下放。',
      '大腿后侧出现明显拉伸时停止，不要求哑铃触地。',
      '呼气收紧臀部并将髋部向前，回到直立姿势。',
    ],
    commonMistakes: ['把动作做成深蹲，膝盖过度前移。', '弓背伸手追求更低位置。', '哑铃远离腿部或顶端过度后仰。'],
    stopConditions: ['腰背出现锐痛或无法保持中立。', '大腿后侧出现突发刺痛，而不是均匀拉伸感。'],
    alternatives: {
      easier: '徒手扶墙髋铰链练习。',
      sameLevel: '哑铃臀桥。',
      harder: '错步哑铃罗马尼亚硬拉。',
    },
    mediaKey: '1459-rR0LJzx',
    mediaMatch: 'exact',
    sourceExerciseId: '1459',
    sourceExerciseName: 'dumbbell romanian deadlift',
  },
  {
    id: 'reverse-lunge',
    name: '哑铃反向箭步蹲',
    homeSetup: '空旷防滑地面、同重量哑铃一对；初学可徒手并在侧面轻扶靠墙稳固椅。',
    primaryMuscles: ['臀肌', '股四头肌'],
    secondaryMuscles: ['大腿后侧', '小腿'],
    steps: [
      '双脚自然站立，哑铃垂于身体两侧，躯干保持直立。',
      '一脚向后迈出足够距离，前脚全掌保持着地。',
      '两侧髋膝弯曲，后膝向地面方向受控下降。',
      '前膝保持与脚尖同向，到稳定深度后停住。',
      '推动前脚全掌回到站立姿势，再完成另一侧。',
    ],
    commonMistakes: ['后撤距离过短，身体挤在一起。', '前膝向内塌或前脚脚跟抬起。', '用后脚猛烈蹬地代替前腿发力。'],
    stopConditions: ['膝、髋或踝关节出现锐痛。', '连续失去平衡或无法控制后膝下降。'],
    alternatives: {
      easier: '扶椅徒手原地分腿蹲。',
      sameLevel: '哑铃高脚杯深蹲。',
      harder: '同重量底部停顿 1-2 秒反向箭步蹲。',
    },
    mediaKey: '0381-SSsBDwB',
    mediaMatch: 'exact',
    mediaNote: '动画左右交替展示；训练记录中的次数按每侧分别计算。',
    sourceExerciseId: '0381',
    sourceExerciseName: 'dumbbell rear lunge',
  },
  {
    id: 'alternating-leg-lower',
    name: '仰卧交替抬腿',
    homeSetup: '平整地面或训练垫，无需其他器材；双腿伸展方向需留出空间。',
    primaryMuscles: ['腹直肌'],
    secondaryMuscles: ['髋屈肌', '深层核心'],
    steps: [
      '仰卧并将双腿抬起，髋膝可保持约 90°或略微伸直。',
      '轻收下腹，使腰部保持自然贴近地面。',
      '一侧腿缓慢向地面方向伸展和下放。',
      '在腰部仍能稳定的位置停住，再将该腿收回。',
      '换另一侧重复，全程保持自然呼吸。',
    ],
    commonMistakes: ['腿下放过低，导致腰部明显拱起。', '依靠快速甩腿完成次数。', '屏住呼吸或用颈部持续紧张代偿。'],
    stopConditions: ['缩小幅度后腰部仍持续离地或疼痛。', '髋前侧抽筋、锐痛或腿部麻木。'],
    alternatives: {
      easier: '屈膝仰卧交替点地。',
      sameLevel: '死虫式交替伸展。',
      harder: '逐步伸直膝盖，增加腿部杠杆长度。',
    },
    mediaUnavailableReason: '数据集最接近的是手脚同时运动的死虫式，与本动作只交替下放双腿不同。',
  },
  {
    id: 'forearm-plank',
    name: '平板支撑',
    homeSetup: '平整防滑地面或训练垫；前臂和脚尖位置需稳定。',
    primaryMuscles: ['腹部', '深层核心'],
    secondaryMuscles: ['臀肌', '肩部'],
    steps: [
      '前臂撑地，肘部位于肩部正下方。',
      '双腿向后伸直，以脚尖支撑身体。',
      '收紧臀腹，使头、肩、髋和脚跟基本成一线。',
      '前臂主动推地，肩膀保持远离耳朵。',
      '自然呼吸，在姿势变形前结束计时。',
    ],
    commonMistakes: ['腰部下沉或臀部抬得过高。', '耸肩、低头或长时间憋气。', '为了达到时间目标而持续保持错误姿势。'],
    stopConditions: ['腰背、肩或肘部出现锐痛。', '出现头晕、麻木或无法维持正常呼吸。'],
    alternatives: {
      easier: '屈膝前臂平板支撑。',
      sameLevel: '死虫式。',
      harder: '姿势稳定后进行交替小幅抬脚平板支撑。',
    },
    mediaUnavailableReason: '数据集候选带背部负重，或包含动态转换、转体和抬腿，均不适合标准静止平板。',
  },
  {
    id: 'push-up',
    name: '俯卧撑',
    homeSetup: '防滑地面或训练垫；退阶版本可直接使用墙面，不使用会移动的桌子。',
    primaryMuscles: ['胸肌'],
    secondaryMuscles: ['肱三头肌', '三角肌前束', '核心'],
    steps: [
      '双手略宽于肩，手指展开，双腿向后伸直。',
      '收紧臀腹，使头到脚跟保持一线。',
      '吸气屈肘，肘部斜向后约 30-45°。',
      '胸部向双手之间受控下降，到稳定深度后停住。',
      '呼气推地回到起始位置，避免耸肩。',
    ],
    commonMistakes: ['塌腰、撅臀或头部先碰近地面。', '肘部横向张开接近 90°。', '下落过快并借地面反弹。'],
    stopConditions: ['手腕、肘或肩部出现锐痛或麻木。', '无法保持躯干一线，降低次数后仍持续变形。'],
    alternatives: {
      easier: '墙壁俯卧撑或跪姿俯卧撑。',
      sameLevel: '标准握哑铃地板卧推。',
      harder: '下放 3 秒并在底部停顿 1 秒的俯卧撑。',
    },
    mediaKey: '0662-I4hDWkc',
    mediaMatch: 'exact',
    sourceExerciseId: '0662',
    sourceExerciseName: 'push-up',
  },
  {
    id: 'neutral-grip-floor-press',
    name: '中立握哑铃地板卧推',
    homeSetup: '防滑地面或训练垫、同重量哑铃一对；掌心全程相对，不用椅子增加行程。',
    primaryMuscles: ['胸肌', '肱三头肌'],
    secondaryMuscles: ['三角肌前束'],
    steps: [
      '坐地将哑铃放在大腿上，再缓慢后躺并屈膝踩稳。',
      '肩胛向下后收，哑铃置于胸部两侧，掌心相对。',
      '吸气缓慢下放，肘部保持靠近躯干。',
      '上臂轻触地面后停住，前臂保持接近垂直。',
      '呼气推起至手臂接近伸直，肩膀保持稳定。',
      '结束时将哑铃收至胸侧，侧滚坐起后放下。',
    ],
    commonMistakes: ['下放时手腕歪斜或肘部向外张开。', '上臂撞击地面借力反弹。', '臀部离地或肩膀向耳朵方向耸起。'],
    stopConditions: ['肩、肘或手腕出现锐痛、夹挤感或麻木。', '哑铃开始左右摇晃，无法安全控制。'],
    alternatives: {
      easier: '减轻重量，或改做墙壁俯卧撑。',
      sameLevel: '标准握哑铃地板卧推。',
      harder: '交替单臂中立握地板卧推，另一侧保持稳定。',
    },
    mediaUnavailableReason: '数据集只有训练凳中立握卧推，行程和肩部负荷与地板版本不同，避免误导。',
  },
  {
    id: 'dumbbell-pullover',
    name: '屈臂哑铃地板上拉',
    homeSetup: '平整地面或训练垫、一只结构牢固的哑铃；先检查锁片和握持位置。',
    primaryMuscles: ['背阔肌', '胸肌'],
    secondaryMuscles: ['肱三头肌', '前锯肌'],
    steps: [
      '仰卧屈膝踩地，双手稳固托住一只哑铃置于胸部上方。',
      '肩胛保持稳定，肋骨向下，肘部维持轻微弯曲。',
      '吸气将哑铃沿弧线缓慢移向头后。',
      '上臂接近地面或肩部达到舒适上限时停止。',
      '呼气用胸背部控制哑铃沿原路线回到胸部上方。',
    ],
    commonMistakes: ['为了下得更低而抬起肋骨、过度反弓腰部。', '动作中频繁屈伸肘部，把上拉变成臂屈伸。', '握持不牢或让哑铃经过面部正上方时失控。'],
    stopConditions: ['哑铃锁片松动、握持滑动或无法可靠控制。', '肩部夹挤、锐痛、手臂麻木或腰部疼痛。'],
    alternatives: {
      easier: '徒手仰卧肩屈伸，先熟悉肋骨稳定和动作范围。',
      sameLevel: '扶椅单臂哑铃划船。',
      harder: '保持原重量，在舒适底部停顿 1 秒后返回。',
    },
    mediaUnavailableReason: '数据集只有训练凳直臂上拉，头后行程更深，与屈臂地板上拉不同。',
  },
  {
    id: 'wide-elbow-dumbbell-row',
    name: '扶椅宽肘单臂哑铃划船',
    homeSetup: '无轮稳固椅背靠墙、一只哑铃；椅子仅供一手轻扶，双脚保持分腿站立。',
    primaryMuscles: ['三角肌后束', '中上背'],
    secondaryMuscles: ['斜方肌', '菱形肌'],
    steps: [
      '一手扶椅背，髋部后移并保持脊柱中立。',
      '持铃手自然垂下，肩膀远离耳朵。',
      '将肘部斜向外约 45-70°，拉向下胸或上腹侧。',
      '顶端轻收肩胛，躯干保持不转动。',
      '缓慢伸直手臂，完成一侧后换边。',
    ],
    commonMistakes: ['肘部完全横向张开并耸肩。', '扭转躯干或猛甩哑铃。', '把动作做成肘贴身体、拉向髋部的普通划船。'],
    stopConditions: ['椅子移动、翘起或支撑手无法稳定。', '肩部夹挤、腰背疼痛或手臂麻木。'],
    alternatives: {
      easier: '扶椅普通单臂哑铃划船。',
      sameLevel: '俯身哑铃反向飞鸟。',
      harder: '同重量顶端停顿 2 秒的宽肘划船。',
    },
    mediaKey: '0377-EKXOMEh',
    mediaMatch: 'adapted',
    mediaNote: '只参考动画中的宽肘划船轨迹，不采用数据集原步骤；居家版本双脚均在地面，只用靠墙稳固椅轻扶。',
    sourceExerciseId: '0377',
    sourceExerciseName: 'dumbbell rear delt row_shoulder',
  },
  {
    id: 'dumbbell-hammer-curl',
    name: '哑铃锤式弯举',
    homeSetup: '防滑地面、同重量哑铃一对；身体两侧保留完整弯举空间。',
    primaryMuscles: ['肱肌', '肱二头肌'],
    secondaryMuscles: ['肱桡肌', '前臂'],
    steps: [
      '双脚站稳，双臂自然下垂，掌心始终相对。',
      '收紧臀腹，肘部贴近身体两侧。',
      '呼气弯曲肘部，将哑铃抬向肩部。',
      '在不让肘部前移的高度短暂停顿。',
      '吸气缓慢下放至手臂接近伸直。',
    ],
    commonMistakes: ['将掌心旋转向前，失去中立握法。', '身体后仰、甩动肩部或肘部前移。', '快速落下哑铃而不控制离心过程。'],
    stopConditions: ['肘部、手腕或前臂出现锐痛或麻木。', '必须依靠身体摆动才能继续。'],
    alternatives: {
      easier: '坐姿或交替单臂轻重量锤式弯举。',
      sameLevel: '交叉身体锤式弯举。',
      harder: '同重量用 3 秒缓慢下放。',
    },
    mediaKey: '0313-slDvUAU',
    mediaMatch: 'exact',
    mediaNote: '数据集原中文步骤错误地要求旋转掌心；本页已修正，整个动作必须保持掌心相对。',
    sourceExerciseId: '0313',
    sourceExerciseName: 'dumbbell hammer curl',
  },
  {
    id: 'rear-foot-elevated-split-squat',
    name: '稳固椅后脚抬高分腿蹲',
    homeSetup: '无轮、无松动且背靠墙的防滑稳固椅；先徒手测试椅子和站距，再拿哑铃。',
    primaryMuscles: ['股四头肌', '臀肌'],
    secondaryMuscles: ['大腿后侧', '小腿'],
    steps: [
      '背对椅子站立，一脚脚背轻放椅面，前脚全掌踩地。',
      '调整前脚距离，使下降时身体仍能保持稳定。',
      '重心主要放在前脚，吸气受控弯曲前侧髋膝。',
      '后膝向地面下降，前膝保持与脚尖同向。',
      '到稳定深度后推动前脚全掌站起，完成一侧再换边。',
    ],
    commonMistakes: ['用后腿猛蹬椅子完成动作。', '前脚距离过近、前膝内扣或脚跟抬起。', '未测试稳定性就直接持重训练。'],
    stopConditions: ['椅子滑动、翘起、松动或高度明显不合适。', '膝、髋、踝出现锐痛，或连续失去平衡。'],
    alternatives: {
      easier: '双脚均在地面的徒手或哑铃原地分腿蹲。',
      sameLevel: '扶墙错步哑铃罗马尼亚硬拉。',
      harder: '同重量底部停顿 1-2 秒后脚抬高分腿蹲。',
    },
    mediaKey: '0410-qx4fgX7',
    mediaMatch: 'adapted',
    mediaNote: '动画使用训练凳抬高后脚；居家只能使用背靠墙、无轮且防滑的稳固椅。',
    sourceExerciseId: '0410',
    sourceExerciseName: 'dumbbell single leg split squat',
  },
  {
    id: 'staggered-stance-romanian-deadlift',
    name: '错步哑铃罗马尼亚硬拉',
    homeSetup: '平整防滑地面、同重量哑铃一对；前后脚只错开半步左右，不使用椅面抬脚。',
    primaryMuscles: ['臀肌', '大腿后侧'],
    secondaryMuscles: ['下背', '单侧稳定'],
    steps: [
      '一脚在前全掌着地，另一脚后撤半步并以脚尖辅助平衡。',
      '约八至九成重心放在前脚，髋部保持朝向正前方。',
      '收紧躯干，髋部向后移动，让哑铃贴近前腿下放。',
      '前侧大腿后方出现拉伸时停止，不追求触地。',
      '收紧前侧臀腿并将髋部向前，回到直立后换边。',
    ],
    commonMistakes: ['把动作做成弓步蹲，膝盖大幅向前。', '后脚承担过多重量或髋部旋转。', '弓背并让哑铃远离前腿。'],
    stopConditions: ['腰背出现锐痛或无法保持中立。', '前侧大腿后方突发刺痛，或身体持续失去平衡。'],
    alternatives: {
      easier: '双脚平行的哑铃罗马尼亚硬拉。',
      sameLevel: '哑铃反向箭步蹲。',
      harder: '一手扶墙的单腿哑铃罗马尼亚硬拉。',
    },
    mediaUnavailableReason: '数据集只有双脚平行或后腿离地版本，均无法准确示范后脚点地的错步姿势。',
  },
  {
    id: 'dumbbell-glute-bridge',
    name: '哑铃臀桥',
    homeSetup: '平整地面或训练垫、一只哑铃；哑铃横放于髋部并始终用双手固定。',
    primaryMuscles: ['臀肌'],
    secondaryMuscles: ['大腿后侧', '核心'],
    steps: [
      '仰卧屈膝，双脚约与髋同宽并全掌踩地。',
      '将哑铃稳定放在髋部，两手固定两端。',
      '轻收下腹，使骨盆保持稳定而不过度拱腰。',
      '推动双脚抬起髋部，直到肩、髋、膝基本成一线。',
      '顶端收紧臀部后缓慢下放，哑铃全程不移动。',
    ],
    commonMistakes: ['顶端用腰部反弓代替臀部伸展。', '双脚距离不合适，膝盖向内塌。', '哑铃放置不稳或双手提前松开。'],
    stopConditions: ['哑铃滑动，或无法用双手稳定固定。', '腰部、髋部或膝部出现锐痛。'],
    alternatives: {
      easier: '徒手双腿臀桥。',
      sameLevel: '徒手臀桥交替抬脚。',
      harder: '扶稳地面的徒手单腿臀桥。',
    },
    mediaKey: '3013-u0cNiij',
    mediaMatch: 'adapted',
    mediaNote: '动画为徒手臀桥；本计划需将一只哑铃横放髋部，并全程用双手固定。',
    sourceExerciseId: '3013',
    sourceExerciseName: 'low glute bridge on floor',
  },
  {
    id: 'standing-calf-raise',
    name: '扶椅站姿哑铃提踵',
    homeSetup: '背靠墙的无轮稳固椅、一只哑铃、平整防滑地面；不在台阶边缘训练。',
    primaryMuscles: ['小腿后侧'],
    secondaryMuscles: ['踝关节稳定肌群'],
    steps: [
      '一手轻扶椅背，另一手持哑铃，双脚约与髋同宽。',
      '保持躯干直立，脚趾自然朝前。',
      '呼气缓慢抬起脚跟，将重量移向前脚掌。',
      '顶端短暂停顿，脚踝保持稳定不向外翻。',
      '吸气缓慢将脚跟放回地面，不借助弹跳。',
    ],
    commonMistakes: ['快速弹跳或只完成很小幅度。', '脚踝向内外偏移，身体压在椅子上。', '站在台阶边缘追求过大下放幅度。'],
    stopConditions: ['椅子移动或无法稳定保持平衡。', '跟腱、小腿或踝关节出现锐痛。'],
    alternatives: {
      easier: '扶椅徒手双脚提踵。',
      sameLevel: '扶椅徒手单脚提踵。',
      harder: '扶椅单脚哑铃提踵。',
    },
    mediaKey: '1373-bJYHBIN',
    mediaMatch: 'adapted',
    mediaNote: '动画为平地徒手提踵；居家版本一手轻扶靠墙稳固椅，另一手持哑铃。',
    sourceExerciseId: '1373',
    sourceExerciseName: 'bodyweight standing calf raise',
  },
  {
    id: 'dumbbell-weighted-crunch',
    name: '哑铃负重卷腹',
    homeSetup: '平整地面或训练垫、一只哑铃；哑铃贴近胸前并用双手固定，不放在头后。',
    primaryMuscles: ['腹直肌'],
    secondaryMuscles: ['腹斜肌', '深层核心'],
    steps: [
      '仰卧屈膝，双脚全掌踩地，哑铃贴近上胸。',
      '下巴与胸口保持自然距离，颈部放松。',
      '呼气并让肋骨向骨盆靠拢，卷起至肩胛离地。',
      '顶端短暂停顿，不继续做成完整仰卧起坐。',
      '吸气缓慢下放肩背，哑铃始终贴近胸口。',
    ],
    commonMistakes: ['把哑铃举到面部上方或放在头后。', '用头颈前伸带动身体。', '坐起幅度过大，主要依赖髋屈肌。'],
    stopConditions: ['颈部或腰部出现锐痛、头晕或恶心。', '哑铃无法稳定贴在胸前。'],
    alternatives: {
      easier: '徒手卷腹。',
      sameLevel: '死虫式。',
      harder: '保持原重量，在卷起顶端停顿 2 秒。',
    },
    mediaUnavailableReason: '数据集动画会抬腿并把杠铃片举向脚，与哑铃贴胸的小幅卷腹明显不同。',
  },
  {
    id: 'side-plank',
    name: '侧平板支撑',
    homeSetup: '平整地面或训练垫；身体侧面需留出完整伸展空间。',
    primaryMuscles: ['腹斜肌', '深层核心'],
    secondaryMuscles: ['肩部', '臀中肌'],
    steps: [
      '侧卧，将下侧肘部放在肩部正下方。',
      '双腿伸直并叠放；需要更稳时可前后错开双脚。',
      '前臂推地并收紧臀腹，将髋部抬离地面。',
      '保持头、肩、髋和脚基本成一线。',
      '自然呼吸，在髋部开始下沉前结束并换边。',
    ],
    commonMistakes: ['肘部离肩膀过远或肩膀耸起。', '髋部向后转、下沉或身体前后摇晃。', '屏住呼吸强行延长时间。'],
    stopConditions: ['肩、肘或腰侧出现锐痛或麻木。', '出现头晕，或无法保持正常呼吸。'],
    alternatives: {
      easier: '屈膝侧平板支撑。',
      sameLevel: '站姿单手哑铃抗侧屈静止。',
      harder: '姿势稳定后进行侧平板上侧腿小幅抬起。',
    },
    mediaKey: '0705-RKjH6Lt',
    mediaMatch: 'exact',
    sourceExerciseId: '0705',
    sourceExerciseName: 'side bridge v. 2',
  },
];

const currentExerciseGuidesById = Object.fromEntries(
  currentExerciseGuides.map((guide) => [guide.id, guide]),
) as Record<string, ExerciseGuide>;

export function getExerciseGuide(exerciseId: string, templateVersion: number): ExerciseGuide | undefined {
  if (templateVersion !== 3) {
    return undefined;
  }
  return currentExerciseGuidesById[exerciseId];
}

export function getCurrentExerciseGuides(): readonly ExerciseGuide[] {
  return currentExerciseGuides;
}
