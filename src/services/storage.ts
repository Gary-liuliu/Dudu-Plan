import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppData, UserProfile, WorkoutSession } from '../types';

export const APP_DATA_STORAGE_KEY = '@dudu-plan/app-data/v1';

export const DEFAULT_PROFILE: UserProfile = {
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

export function createDefaultAppData(): AppData {
  return {
    version: 2,
    profile: { ...DEFAULT_PROFILE },
    sessions: [],
    nutritionByDate: {},
    weightRecords: [],
  };
}

export function normalizeWorkoutSession(value: unknown): WorkoutSession | null {
  if (!isRecord(value) || typeof value.startedAt !== 'string') {
    return null;
  }

  const fallbackUpdatedAt =
    typeof value.completedAt === 'string' ? value.completedAt : value.startedAt;

  return {
    ...(value as unknown as WorkoutSession),
    updatedAt:
      typeof value.updatedAt === 'string' ? value.updatedAt : fallbackUpdatedAt,
    templateVersion:
      typeof value.templateVersion === 'number' ? value.templateVersion : 1,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAppData(value: unknown): AppData {
  const defaults = createDefaultAppData();

  if (!isRecord(value)) {
    return defaults;
  }

  const profile = isRecord(value.profile)
    ? ({ ...defaults.profile, ...value.profile } as UserProfile)
    : defaults.profile;

  return {
    version: 2,
    profile,
    sessions: Array.isArray(value.sessions)
      ? value.sessions
          .map(normalizeWorkoutSession)
          .filter((session): session is WorkoutSession => session !== null)
      : [],
    nutritionByDate: isRecord(value.nutritionByDate)
      ? (value.nutritionByDate as AppData['nutritionByDate'])
      : {},
    weightRecords: Array.isArray(value.weightRecords)
      ? (value.weightRecords as AppData['weightRecords'])
      : [],
  };
}

export async function loadAppData(): Promise<AppData> {
  try {
    const storedValue = await AsyncStorage.getItem(APP_DATA_STORAGE_KEY);
    return storedValue ? normalizeAppData(JSON.parse(storedValue)) : createDefaultAppData();
  } catch {
    return createDefaultAppData();
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
}

export async function clearAppData(): Promise<void> {
  await AsyncStorage.removeItem(APP_DATA_STORAGE_KEY);
}
