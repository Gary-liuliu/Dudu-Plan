import type { AccountName, AppRole, AuthSession } from '../types';

function isAccountName(value: unknown): value is AccountName {
  return value === '嘟嘟' || value === '肚肚';
}

function isAppRole(value: unknown): value is AppRole {
  return value === 'owner' || value === 'observer';
}

export function parseAuthSession(value: unknown): AuthSession | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const session = value as Partial<AuthSession>;
  if (
    !isAccountName(session.accountName) ||
    !isAppRole(session.role) ||
    (session.role === 'owner' && session.accountName !== '嘟嘟') ||
    (session.role === 'observer' && session.accountName !== '肚肚') ||
    typeof session.accessToken !== 'string' ||
    session.accessToken.length === 0 ||
    typeof session.refreshToken !== 'string' ||
    session.refreshToken.length === 0 ||
    typeof session.accessTokenExpiresAt !== 'number' ||
    !Number.isFinite(session.accessTokenExpiresAt) ||
    typeof session.refreshTokenExpiresAt !== 'number' ||
    !Number.isFinite(session.refreshTokenExpiresAt)
  ) {
    return null;
  }

  return session as AuthSession;
}
