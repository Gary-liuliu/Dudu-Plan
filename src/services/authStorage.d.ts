import type { AuthSession } from '../types';

export function loadAuthSession(): Promise<AuthSession | null>;
export function saveAuthSession(session: AuthSession): Promise<void>;
export function clearAuthSession(): Promise<void>;
