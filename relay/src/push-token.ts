const expoPushTokenPattern = /^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/u;

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === "string" && expoPushTokenPattern.test(value);
}
