export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function cancelWorkoutReminders(): Promise<void> {}

export async function scheduleWorkoutReminders(
  _hour = 19,
  _minute = 30,
): Promise<boolean> {
  return false;
}

export async function rescheduleWorkoutReminders(
  _enabled: boolean,
  _hour = 19,
  _minute = 30,
): Promise<boolean> {
  return false;
}

export async function getObserverPushToken(): Promise<string | null> {
  return null;
}

export async function unregisterObserverPushToken(): Promise<void> {}
