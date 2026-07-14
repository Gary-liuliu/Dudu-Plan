import { calculateBmi, estimateNavyBodyFat } from './bodyMetrics';
import type { UserProfile } from '../types';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertBetween(actual: number | null, minimum: number, maximum: number): void {
  if (actual === null || actual < minimum || actual > maximum) {
    throw new Error(`expected ${String(actual)} to be between ${minimum} and ${maximum}`);
  }
}

const baseProfile: UserProfile = {
  heightCm: 178,
  weightKg: 70,
  proteinTargetG: 130,
  waterTargetMl: 2500,
  workoutHour: 19,
  workoutMinute: 30,
  weightStepKg: 1,
  reminderEnabled: true,
  birthSex: 'unspecified',
  age: null,
  waistCm: null,
  neckCm: null,
  hipCm: null,
};

assertEqual(calculateBmi(70, 178), 22.1, 'BMI 应保留一位小数');
assertEqual(calculateBmi(70, 0), null, '无效身高不应计算 BMI');
assertEqual(
  estimateNavyBodyFat(baseProfile),
  null,
  '出生性别和围度不完整时不应估算体脂',
);

const maleEstimate = estimateNavyBodyFat({
  ...baseProfile,
  birthSex: 'male',
  waistCm: 82,
  neckCm: 38,
});
assertBetween(maleEstimate, 13, 15);

const femaleMissingHipEstimate = estimateNavyBodyFat({
  ...baseProfile,
  birthSex: 'female',
  heightCm: 165,
  waistCm: 70,
  neckCm: 33,
});
assertEqual(femaleMissingHipEstimate, null, '女性资料缺少臀围时不应估算');

const femaleEstimate = estimateNavyBodyFat({
  ...baseProfile,
  birthSex: 'female',
  heightCm: 165,
  waistCm: 70,
  neckCm: 33,
  hipCm: 95,
});
assertBetween(femaleEstimate, 23, 26);

const invalidCircumferenceEstimate = estimateNavyBodyFat({
  ...baseProfile,
  birthSex: 'male',
  waistCm: 35,
  neckCm: 40,
});
assertEqual(invalidCircumferenceEstimate, null, '无效围度关系不应返回估算值');
