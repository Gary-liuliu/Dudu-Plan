import AsyncStorage from '@react-native-async-storage/async-storage';

import { parseAuthSession } from '../domain/authSession';
import type { AuthSession } from '../types';

const authStorageKey = '@dudu-plan/auth-session/v1';

export async function loadAuthSession(): Promise<AuthSession | null> {
  try {
    const storedValue = await AsyncStorage.getItem(authStorageKey);
    return storedValue ? parseAuthSession(JSON.parse(storedValue)) : null;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setItem(authStorageKey, JSON.stringify(session));
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.removeItem(authStorageKey);
}
