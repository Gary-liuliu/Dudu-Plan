import type { UserProfile } from '../types';

type NavyBodyFatProfile = Pick<
  UserProfile,
  'birthSex' | 'heightCm' | 'waistCm' | 'neckCm' | 'hipCm'
>;

const centimetersPerInch = 2.54;

function isPositiveMeasurement(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !isPositiveMeasurement(heightCm)) {
    return null;
  }

  const heightMeters = heightCm / 100;
  return roundToOneDecimal(weightKg / heightMeters ** 2);
}

// [Function] 仅用完整有效围度估算海军体脂率。[Warning] 结果只适合观察趋势。
export function estimateNavyBodyFat(profile: NavyBodyFatProfile): number | null {
  const { birthSex, heightCm, waistCm, neckCm, hipCm } = profile;

  if (
    birthSex === 'unspecified' ||
    !isPositiveMeasurement(heightCm) ||
    !isPositiveMeasurement(waistCm) ||
    !isPositiveMeasurement(neckCm)
  ) {
    return null;
  }

  const heightInches = heightCm / centimetersPerInch;
  const waistInches = waistCm / centimetersPerInch;
  const neckInches = neckCm / centimetersPerInch;
  let bodyFatPercentage: number;

  if (birthSex === 'male') {
    const circumferenceDifference = waistInches - neckInches;
    if (circumferenceDifference <= 0) {
      return null;
    }

    bodyFatPercentage =
      86.01 * Math.log10(circumferenceDifference) -
      70.041 * Math.log10(heightInches) +
      36.76;
  } else {
    if (!isPositiveMeasurement(hipCm)) {
      return null;
    }

    const circumferenceDifference =
      waistInches + hipCm / centimetersPerInch - neckInches;
    if (circumferenceDifference <= 0) {
      return null;
    }

    bodyFatPercentage =
      163.205 * Math.log10(circumferenceDifference) -
      97.684 * Math.log10(heightInches) -
      78.387;
  }

  if (!Number.isFinite(bodyFatPercentage) || bodyFatPercentage <= 0 || bodyFatPercentage > 75) {
    return null;
  }

  return roundToOneDecimal(bodyFatPercentage);
}
