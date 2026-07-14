export function requestNotificationPermission(): Promise<boolean>;
export function cancelWorkoutReminders(): Promise<void>;
export function scheduleWorkoutReminders(hour?: number, minute?: number): Promise<boolean>;
export function rescheduleWorkoutReminders(
  enabled: boolean,
  hour?: number,
  minute?: number,
): Promise<boolean>;
