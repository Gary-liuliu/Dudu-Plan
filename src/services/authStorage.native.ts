import * as SecureStore from 'expo-secure-store';

import { parseAuthSession } from '../domain/authSession';
import type { AuthSession } from '../types';

const authStorageKey = 'dudu-plan-auth-session-v1';

export async function loadAuthSession(): Promise<AuthSession | null> {
  try {
    const storedValue = await SecureStore.getItemAsync(authStorageKey);
    return storedValue ? parseAuthSession(JSON.parse(storedValue)) : null;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(authStorageKey, JSON.stringify(session));
}

export async function clearAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(authStorageKey);
}
