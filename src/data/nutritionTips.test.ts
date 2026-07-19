import { nutritionTips } from './nutritionTips';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const requiredTitles = [
  '外卖怎么点',
  '麻辣烫/冒菜',
  '盖饭/便当',
  '每餐蛋白质',
  '训练日碳水',
  '无糖饮料',
  '酱汁分装',
  '看长期趋势',
];

assert(nutritionTips.length >= 8, '减脂增肌技巧不得少于 8 条');
assert(new Set(nutritionTips.map((tip) => tip.id)).size === nutritionTips.length, '技巧 ID 必须唯一');
assert(nutritionTips[0]?.id === 'takeout', '外卖技巧必须排在列表首位');

for (const requiredTitle of requiredTitles) {
  assert(nutritionTips.some((tip) => tip.title === requiredTitle), `缺少技巧：${requiredTitle}`);
}

for (const tip of nutritionTips) {
  assert(tip.id.length > 0, '技巧 ID 不得为空');
  assert(tip.summary.length > 0, `${tip.title} 必须提供折叠摘要`);
  assert(
    tip.suggestions.length >= 2 && tip.suggestions.length <= 4,
    `${tip.title} 必须提供 2 至 4 条具体建议`,
  );
  assert(tip.suggestions.every((suggestion) => suggestion.length > 0), `${tip.title} 的建议不得为空`);
}
