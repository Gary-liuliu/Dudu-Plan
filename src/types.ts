export type AppTab = 'home' | 'workout' | 'nutrition' | 'progress';

export type AppRole = 'owner' | 'observer';

export type AccountName = '嘟嘟' | '肚肚';

export type RealtimeConnectionState = 'connecting' | 'online' | 'offline';

export type WorkoutKind = 'upper-a' | 'lower-a' | 'upper-b' | 'lower-b';

export type RepUnit = '次' | '秒';

export type ExerciseEquipment = 'dumbbell' | 'bodyweight' | 'power-bar';

export interface ExerciseTemplate {
  id: string;
  name: string;
  focus: string;
  sets: number;
  repMin: number;
  repMax: number;
  repUnit: RepUnit;
  restSeconds: number;
  equipment: ExerciseEquipment;
  section: 'strength' | 'core';
  isPerSide?: boolean;
  tip: string;
  warning?: string;
}

export interface WorkoutTemplate {
  kind: WorkoutKind;
  title: string;
  shortTitle: string;
  subtitle: string;
  accent: string;
  exercises: ExerciseTemplate[];
}

export interface SetLog {
  index: number;
  weightKg: number | null;
  reps: number;
  rir: number;
  completed: boolean;
  pain: boolean;
  completedAt?: string;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
}

export interface RestTimerState {
  exerciseId: string;
  setIndex: number;
  endAt: number;
  durationSeconds: number;
}

export interface WorkoutSession {
  id: string;
  scheduledDate: string;
  kind: WorkoutKind;
  source: 'scheduled' | 'makeup';
  status: 'in_progress' | 'completed' | 'skipped';
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  currentExerciseIndex: number;
  exerciseLogs: ExerciseLog[];
  restTimer?: RestTimerState;
  templateVersion: number;
}

export interface IntakeEntry {
  id: string;
  amount: number;
  at: string;
  label?: string;
}

export interface DailyNutritionLog {
  waterEntries: IntakeEntry[];
  proteinEntries: IntakeEntry[];
}

export interface WeightRecord {
  id: string;
  date: string;
  weightKg: number;
}

export interface UserProfile {
  heightCm: number;
  weightKg: number;
  proteinTargetG: number;
  waterTargetMl: number;
  workoutHour: number;
  workoutMinute: number;
  weightStepKg: number;
  reminderEnabled: boolean;
  birthSex: 'unspecified' | 'male' | 'female';
  age: number | null;
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
}

export interface AppData {
  version: 2;
  profile: UserProfile;
  sessions: WorkoutSession[];
  nutritionByDate: Record<string, DailyNutritionLog>;
  weightRecords: WeightRecord[];
}

export interface AuthSession {
  accountName: AccountName;
  role: AppRole;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

export interface ObserverCache {
  version: 1;
  sessions: WorkoutSession[];
  lastSyncedAt: string | null;
  handledWorkoutEventIds: string[];
}

export type ChatMessageType = 'text' | 'encouragement';

export type ChatLocalState = 'sending' | 'failed';

export interface ChatMessage {
  id: number | null;
  messageId: string;
  senderRole: AppRole;
  receiverRole: AppRole;
  messageType: ChatMessageType;
  content: string | null;
  replyToMessageId: string | null;
  clientCreatedAt: number;
  serverCreatedAt: number | null;
  deliveredAt: number | null;
  readAt: number | null;
  recalledAt: number | null;
  localState?: ChatLocalState;
}

export interface ProgressionSuggestion {
  tone: 'increase' | 'hold' | 'reduce' | 'recover' | 'baseline';
  title: string;
  detail: string;
  suggestedWeightKg?: number;
}

export interface TodayWorkoutState {
  phase: 'rest' | 'upcoming' | 'prep' | 'due' | 'active' | 'completed' | 'skipped';
  template: WorkoutTemplate | null;
  session: WorkoutSession | null;
  title: string;
  detail: string;
}
