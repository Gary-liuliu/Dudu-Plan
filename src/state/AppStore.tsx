import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  CURRENT_WORKOUT_TEMPLATE_VERSION,
  getWorkoutTemplate,
} from '../data/workoutPlan';
import {
  applySetLogPatch,
  createExerciseSetLogs,
  type SetLogPatch,
} from '../domain/workoutSets';
import {
  createDefaultAppData,
  loadAppData,
  saveAppData,
} from '../services/storage';
import type {
  AppData,
  DailyNutritionLog,
  ExerciseLog,
  UserProfile,
  WeightRecord,
  WorkoutKind,
  WorkoutSession,
} from '../types';
import { createLocalId } from '../utils/id';

export interface AppStoreValue {
  data: AppData;
  hydrated: boolean;
  activeSession: WorkoutSession | null;
  todayNutrition: DailyNutritionLog;
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
  startWorkout: (
    kind: WorkoutKind,
    scheduledDate: string,
    source?: WorkoutSession['source'],
  ) => WorkoutSession;
  updateSet: (
    sessionId: string,
    exerciseId: string,
    setIndex: number,
    patch: SetLogPatch,
  ) => void;
  completeSet: (
    sessionId: string,
    exerciseId: string,
    setIndex: number,
    restSeconds: number,
  ) => void;
  setCurrentExercise: (index: number, sessionId?: string) => void;
  addRestSeconds: (seconds?: number, sessionId?: string) => void;
  skipRest: (sessionId?: string) => void;
  finishWorkout: (sessionId?: string) => void;
  skipWorkout: (sessionId?: string) => void;
  addWater: (amountMl: number, label?: string) => void;
  undoWater: (entryId?: string) => void;
  addProtein: (amountG: number, label?: string) => void;
  undoProtein: (entryId?: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  addWeightRecord: (weightKg: number, date?: string) => WeightRecord;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function findActiveSession(sessions: WorkoutSession[]): WorkoutSession | null {
  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    if (sessions[index].status === 'in_progress') {
      return sessions[index];
    }
  }

  return null;
}

function updateSession(
  data: AppData,
  sessionId: string,
  update: (session: WorkoutSession) => WorkoutSession,
): AppData {
  let foundSession = false;
  const sessions = data.sessions.map((session) => {
    if (session.id !== sessionId) {
      return session;
    }

    foundSession = true;
    const updatedSession = update(session);
    return updatedSession === session
      ? session
      : { ...updatedSession, updatedAt: new Date().toISOString() };
  });

  return foundSession ? { ...data, sessions } : data;
}

function resolveSessionId(data: AppData, sessionId?: string): string | null {
  return sessionId ?? findActiveSession(data.sessions)?.id ?? null;
}

function findLatestCompletedExerciseLog(
  sessions: WorkoutSession[],
  exerciseId: string,
): ExerciseLog | undefined {
  for (let sessionIndex = sessions.length - 1; sessionIndex >= 0; sessionIndex -= 1) {
    const session = sessions[sessionIndex];
    if (session.status !== 'completed') {
      continue;
    }

    const exerciseLog = session.exerciseLogs.find((log) => log.exerciseId === exerciseId);
    if (exerciseLog) {
      return exerciseLog;
    }
  }

  return undefined;
}

// [Function] 统一管理本地训练、营养与身体记录。[Warning] 水合完成前的操作必须排队重放。
export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createDefaultAppData);
  const [hydrated, setHydrated] = useState(false);
  const dataRef = useRef(data);
  const hydratedRef = useRef(false);
  const hydrationRef = useRef<Promise<void> | null>(null);
  const pendingUpdatesRef = useRef<Array<(current: AppData) => AppData>>([]);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  const queuePersist = useCallback((snapshot: AppData): Promise<void> => {
    const saveTask = persistQueueRef.current
      .catch(() => undefined)
      .then(() => saveAppData(snapshot));
    persistQueueRef.current = saveTask;
    return saveTask;
  }, []);

  const commitData = useCallback(
    (update: (current: AppData) => AppData): AppData => {
      const nextData = update(dataRef.current);

      if (nextData === dataRef.current) {
        return nextData;
      }

      dataRef.current = nextData;
      setData(nextData);

      if (!hydratedRef.current) {
        pendingUpdatesRef.current.push(update);
        return nextData;
      }

      void queuePersist(nextData).catch(() => undefined);
      return nextData;
    },
    [queuePersist],
  );

  const hydrate = useCallback((): Promise<void> => {
    if (!hydrationRef.current) {
      hydrationRef.current = loadAppData()
        .then((storedData) => {
          const pendingUpdates = pendingUpdatesRef.current;
          pendingUpdatesRef.current = [];
          const hydratedData = pendingUpdates.reduce(
            (current, update) => update(current),
            storedData,
          );

          dataRef.current = hydratedData;
          hydratedRef.current = true;
          setData(hydratedData);

          if (pendingUpdates.length > 0) {
            return queuePersist(hydratedData);
          }

          return undefined;
        })
        .finally(() => setHydrated(true));
    }

    return hydrationRef.current;
  }, [queuePersist]);

  const persist = useCallback(
    async () => {
      await hydrate();
      await queuePersist(dataRef.current);
    },
    [hydrate, queuePersist],
  );

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const startWorkout = useCallback(
    (
      kind: WorkoutKind,
      scheduledDate: string,
      source: WorkoutSession['source'] = 'scheduled',
    ): WorkoutSession => {
      const existingSession = findActiveSession(dataRef.current.sessions);

      if (existingSession) {
        return existingSession;
      }

      const template = getWorkoutTemplate(kind);
      const existingSessions = dataRef.current.sessions;
      const startedAt = new Date().toISOString();
      const session: WorkoutSession = {
        id: createLocalId('workout'),
        scheduledDate,
        kind,
        source,
        status: 'in_progress',
        startedAt,
        updatedAt: startedAt,
        currentExerciseIndex: 0,
        exerciseLogs: template.exercises.map((exercise) => {
          const previousLog = findLatestCompletedExerciseLog(existingSessions, exercise.id);
          const previousCompletedSets = previousLog?.sets.filter((setLog) => setLog.completed) ?? [];

          return {
            exerciseId: exercise.id,
            sets: createExerciseSetLogs(exercise, previousCompletedSets),
          };
        }),
        templateVersion: CURRENT_WORKOUT_TEMPLATE_VERSION,
      };

      commitData((current) => ({
        ...current,
        sessions: [...current.sessions, session],
      }));
      return session;
    },
    [commitData],
  );

  const updateSet = useCallback(
    (
      sessionId: string,
      exerciseId: string,
      setIndex: number,
      patch: SetLogPatch,
    ): void => {
      commitData((current) =>
        updateSession(current, sessionId, (session) => {
          const exerciseLogs = session.exerciseLogs.map((exerciseLog) => {
            if (exerciseLog.exerciseId !== exerciseId) {
              return exerciseLog;
            }

            const sets = applySetLogPatch(exerciseLog.sets, setIndex, patch);
            return sets === exerciseLog.sets ? exerciseLog : { ...exerciseLog, sets };
          });
          const hasChanges = exerciseLogs.some(
            (exerciseLog, index) => exerciseLog !== session.exerciseLogs[index],
          );

          return hasChanges ? { ...session, exerciseLogs } : session;
        }),
      );
    },
    [commitData],
  );

  const completeSet = useCallback(
    (
      sessionId: string,
      exerciseId: string,
      setIndex: number,
      restSeconds: number,
    ): void => {
      const completedAt = new Date().toISOString();
      const durationSeconds = Math.max(0, Math.round(restSeconds));

      commitData((current) =>
        updateSession(current, sessionId, (session) => {
          let didCompleteSet = false;
          const exerciseLogs = session.exerciseLogs.map((exerciseLog) => {
            if (exerciseLog.exerciseId !== exerciseId) {
              return exerciseLog;
            }

            const sets = exerciseLog.sets.map((setLog) => {
              if (setLog.index !== setIndex || setLog.completed) {
                return setLog;
              }

              return { ...setLog, completed: true, completedAt };
            });
            const didUpdateExercise = sets.some(
              (setLog, index) => setLog !== exerciseLog.sets[index],
            );

            if (!didUpdateExercise) {
              return exerciseLog;
            }

            didCompleteSet = true;
            return { ...exerciseLog, sets };
          });

          if (!didCompleteSet) {
            return session;
          }

          return {
            ...session,
            exerciseLogs,
            restTimer:
              durationSeconds > 0
                ? {
                    exerciseId,
                    setIndex,
                    durationSeconds,
                    endAt: Date.now() + durationSeconds * 1000,
                  }
                : undefined,
          };
        }),
      );
    },
    [commitData],
  );

  const setCurrentExercise = useCallback(
    (index: number, sessionId?: string): void => {
      commitData((current) => {
        const targetSessionId = resolveSessionId(current, sessionId);
        if (!targetSessionId) {
          return current;
        }

        return updateSession(current, targetSessionId, (session) => ({
          ...session,
          currentExerciseIndex: Math.max(
            0,
            Math.min(Math.round(index), Math.max(0, session.exerciseLogs.length - 1)),
          ),
        }));
      });
    },
    [commitData],
  );

  const addRestSeconds = useCallback(
    (seconds = 30, sessionId?: string): void => {
      commitData((current) => {
        const targetSessionId = resolveSessionId(current, sessionId);
        if (!targetSessionId) {
          return current;
        }

        return updateSession(current, targetSessionId, (session) => {
          if (!session.restTimer) {
            return session;
          }

          const addedSeconds = Math.max(0, Math.round(seconds));
          return {
            ...session,
            restTimer: {
              ...session.restTimer,
              durationSeconds: session.restTimer.durationSeconds + addedSeconds,
              endAt: Math.max(Date.now(), session.restTimer.endAt) + addedSeconds * 1000,
            },
          };
        });
      });
    },
    [commitData],
  );

  const skipRest = useCallback(
    (sessionId?: string): void => {
      commitData((current) => {
        const targetSessionId = resolveSessionId(current, sessionId);
        if (!targetSessionId) {
          return current;
        }

        return updateSession(current, targetSessionId, (session) => ({
          ...session,
          restTimer: undefined,
        }));
      });
    },
    [commitData],
  );

  const finishWorkout = useCallback(
    (sessionId?: string): void => {
      commitData((current) => {
        const targetSessionId = resolveSessionId(current, sessionId);
        if (!targetSessionId) {
          return current;
        }

        return updateSession(current, targetSessionId, (session) => ({
          ...session,
          status: 'completed',
          completedAt: new Date().toISOString(),
          restTimer: undefined,
        }));
      });
    },
    [commitData],
  );

  const skipWorkout = useCallback(
    (sessionId?: string): void => {
      commitData((current) => {
        const targetSessionId = resolveSessionId(current, sessionId);
        if (!targetSessionId) {
          return current;
        }

        return updateSession(current, targetSessionId, (session) => ({
          ...session,
          status: 'skipped',
          completedAt: new Date().toISOString(),
          restTimer: undefined,
        }));
      });
    },
    [commitData],
  );

  const updateNutrition = useCallback(
    (
      entryType: 'waterEntries' | 'proteinEntries',
      amount: number,
      label?: string,
    ): void => {
      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }

      const dateKey = getLocalDateKey();
      const entry = {
        id: createLocalId(entryType === 'waterEntries' ? 'water' : 'protein'),
        amount,
        at: new Date().toISOString(),
        ...(label ? { label } : {}),
      };

      commitData((current) => {
        const currentLog = current.nutritionByDate[dateKey] ?? {
          waterEntries: [],
          proteinEntries: [],
        };

        return {
          ...current,
          nutritionByDate: {
            ...current.nutritionByDate,
            [dateKey]: {
              ...currentLog,
              [entryType]: [...currentLog[entryType], entry],
            },
          },
        };
      });
    },
    [commitData],
  );

  const undoNutrition = useCallback(
    (entryType: 'waterEntries' | 'proteinEntries', entryId?: string): void => {
      const dateKey = getLocalDateKey();

      commitData((current) => {
        const currentLog = current.nutritionByDate[dateKey];
        if (!currentLog || currentLog[entryType].length === 0) {
          return current;
        }

        const entries = entryId
          ? currentLog[entryType].filter((entry) => entry.id !== entryId)
          : currentLog[entryType].slice(0, -1);

        if (entries.length === currentLog[entryType].length) {
          return current;
        }

        return {
          ...current,
          nutritionByDate: {
            ...current.nutritionByDate,
            [dateKey]: { ...currentLog, [entryType]: entries },
          },
        };
      });
    },
    [commitData],
  );

  const addWater = useCallback(
    (amountMl: number, label?: string) =>
      updateNutrition('waterEntries', amountMl, label),
    [updateNutrition],
  );

  const undoWater = useCallback(
    (entryId?: string) => undoNutrition('waterEntries', entryId),
    [undoNutrition],
  );

  const addProtein = useCallback(
    (amountG: number, label?: string) =>
      updateNutrition('proteinEntries', amountG, label),
    [updateNutrition],
  );

  const undoProtein = useCallback(
    (entryId?: string) => undoNutrition('proteinEntries', entryId),
    [undoNutrition],
  );

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>): void => {
      commitData((current) => ({
        ...current,
        profile: { ...current.profile, ...patch },
      }));
    },
    [commitData],
  );

  const addWeightRecord = useCallback(
    (weightKg: number, date = getLocalDateKey()): WeightRecord => {
      const record: WeightRecord = {
        id: createLocalId('weight'),
        date,
        weightKg,
      };

      if (!Number.isFinite(weightKg) || weightKg <= 0) {
        return record;
      }

      commitData((current) => ({
        ...current,
        profile: { ...current.profile, weightKg },
        weightRecords: [...current.weightRecords, record],
      }));
      return record;
    },
    [commitData],
  );

  const activeSession = useMemo(
    () => findActiveSession(data.sessions),
    [data.sessions],
  );
  const todayNutrition = useMemo<DailyNutritionLog>(
    () =>
      data.nutritionByDate[getLocalDateKey()] ?? {
        waterEntries: [],
        proteinEntries: [],
      },
    [data.nutritionByDate],
  );

  const value = useMemo<AppStoreValue>(
    () => ({
      data,
      hydrated,
      activeSession,
      todayNutrition,
      hydrate,
      persist,
      startWorkout,
      updateSet,
      completeSet,
      setCurrentExercise,
      addRestSeconds,
      skipRest,
      finishWorkout,
      skipWorkout,
      addWater,
      undoWater,
      addProtein,
      undoProtein,
      updateProfile,
      addWeightRecord,
    }),
    [
      activeSession,
      addProtein,
      addRestSeconds,
      addWater,
      addWeightRecord,
      completeSet,
      data,
      finishWorkout,
      hydrate,
      hydrated,
      persist,
      setCurrentExercise,
      skipRest,
      skipWorkout,
      startWorkout,
      todayNutrition,
      undoProtein,
      undoWater,
      updateProfile,
      updateSet,
    ],
  );

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreValue {
  const store = useContext(AppStoreContext);

  if (!store) {
    throw new Error('useAppStore must be used within AppStoreProvider');
  }

  return store;
}
