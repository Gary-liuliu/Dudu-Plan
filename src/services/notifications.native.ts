import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { WorkoutKind } from '../types';

const workoutReminderChannelId = 'workout-reminders';
const observerUpdateChannelId = 'observer-updates';
const defaultWorkoutHour = 19;
const defaultWorkoutMinute = 30;
const prepLeadMinutes = 10;

interface WorkoutReminderDay {
  key: string;
  jsWeekday: number;
  kind: WorkoutKind;
  label: string;
}

const workoutReminderDays: WorkoutReminderDay[] = [
  { key: 'mon', jsWeekday: 1, kind: 'upper-a', label: '上肢 A' },
  { key: 'tue', jsWeekday: 2, kind: 'lower-a', label: '下肢 A' },
  { key: 'thu', jsWeekday: 4, kind: 'upper-b', label: '上肢 B' },
  { key: 'fri', jsWeekday: 5, kind: 'lower-b', label: '下肢 B' },
];

const reminderIdentifiers = workoutReminderDays.flatMap(({ key }) => [
  `dudu-workout-${key}-prep`,
  `dudu-workout-${key}-due`,
]);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function hasNotificationPermission(
  status: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>,
): boolean {
  return (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

function assertValidTime(hour: number, minute: number): void {
  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new RangeError('训练提醒时间必须是有效的小时和分钟。');
  }
}

function getPrepTime(hour: number, minute: number): {
  hour: number;
  minute: number;
  previousDay: boolean;
} {
  const prepTotalMinutes = hour * 60 + minute - prepLeadMinutes;
  const normalizedMinutes =
    (prepTotalMinutes + 24 * 60) % (24 * 60);

  return {
    hour: Math.floor(normalizedMinutes / 60),
    minute: normalizedMinutes % 60,
    previousDay: prepTotalMinutes < 0,
  };
}

function getExpoWeekday(jsWeekday: number, previousDay = false): number {
  const adjustedJsWeekday = previousDay
    ? (jsWeekday + 6) % 7
    : jsWeekday;

  // Expo 周触发器以 1 表示周日，与 JavaScript Date 的 0 起始不同。
  return adjustedJsWeekday + 1;
}

async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(workoutReminderChannelId, {
    name: '训练提醒',
    description: '嘟嘟计划每周训练准备与开始提醒',
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
    vibrationPattern: [0, 250, 180, 250],
    lightColor: '#FF4D8D',
    sound: 'default',
    showBadge: false,
  });
  await Notifications.setNotificationChannelAsync(observerUpdateChannelId, {
    name: '训练动态',
    description: '嘟嘟开始和完成训练的实时通知',
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
    vibrationPattern: [0, 250, 180, 250],
    lightColor: '#7C5CFC',
    sound: 'default',
    showBadge: false,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  await configureAndroidChannel();

  const currentStatus = await Notifications.getPermissionsAsync();
  if (hasNotificationPermission(currentStatus)) {
    return true;
  }

  const requestedStatus = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return hasNotificationPermission(requestedStatus);
}

export async function cancelWorkoutReminders(): Promise<void> {
  await Promise.all(
    reminderIdentifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier),
    ),
  );
}

// [Function] 重建每周本地提醒。[Warning] 任一调度失败时取消本轮全部提醒。
export async function scheduleWorkoutReminders(
  hour = defaultWorkoutHour,
  minute = defaultWorkoutMinute,
): Promise<boolean> {
  assertValidTime(hour, minute);
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) {
    return false;
  }

  await cancelWorkoutReminders();
  const prepTime = getPrepTime(hour, minute);

  try {
    await Promise.all(
      workoutReminderDays.flatMap((day) => [
        Notifications.scheduleNotificationAsync({
          identifier: `dudu-workout-${day.key}-prep`,
          content: {
            title: `10 分钟后 · ${day.label}`,
            body: '准备好哑铃、臂力棒和饮用水。',
            sound: 'default',
            color: '#FF4D8D',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: {
              source: 'local-workout-reminder',
              phase: 'prep',
              workoutKind: day.kind,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: getExpoWeekday(day.jsWeekday, prepTime.previousDay),
            hour: prepTime.hour,
            minute: prepTime.minute,
            channelId: workoutReminderChannelId,
          },
        }),
        Notifications.scheduleNotificationAsync({
          identifier: `dudu-workout-${day.key}-due`,
          content: {
            title: `现在开始 · ${day.label}`,
            body: '打开嘟嘟计划，记录每一组的重量和次数。',
            sound: 'default',
            color: '#00BFA6',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: {
              source: 'local-workout-reminder',
              phase: 'due',
              workoutKind: day.kind,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: getExpoWeekday(day.jsWeekday),
            hour,
            minute,
            channelId: workoutReminderChannelId,
          },
        }),
      ]),
    );
  } catch (error) {
    await cancelWorkoutReminders();
    throw error;
  }

  return true;
}

export async function rescheduleWorkoutReminders(
  enabled: boolean,
  hour = defaultWorkoutHour,
  minute = defaultWorkoutMinute,
): Promise<boolean> {
  await cancelWorkoutReminders();
  return enabled ? scheduleWorkoutReminders(hour, minute) : false;
}

export async function showWorkoutEventNotification(
  eventType: 'workout_started' | 'workout_completed',
  sessionId: string,
): Promise<void> {
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: eventType === 'workout_started' ? '嘟嘟开始训练了' : '嘟嘟完成训练了',
      body: eventType === 'workout_started'
        ? '打开嘟嘟计划查看实时训练步骤。'
        : '本次训练已经记录完成。',
      sound: 'default',
      color: '#7C5CFC',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: { source: 'realtime-workout-event', eventType, sessionId },
    },
    trigger: null,
  });
}
