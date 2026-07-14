import { parseAuthSession } from '../domain/authSession';
import type { AuthSession } from '../types';

const requestTimeoutMs = 12_000;

export type AccountApiErrorCode =
  | 'invalid_credentials'
  | 'invalid_request'
  | 'invalid_response'
  | 'not_configured'
  | 'request_failed'
  | 'timeout'
  | 'unauthorized'
  | 'unavailable';

export class AccountApiError extends Error {
  readonly code: AccountApiErrorCode;

  constructor(code: AccountApiErrorCode) {
    super(code);
    this.name = 'AccountApiError';
    this.code = code;
  }
}

export function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof AccountApiError)) {
    return '登录失败，请稍后重试。';
  }

  switch (error.code) {
    case 'invalid_credentials':
      return '用户名或密码错误。';
    case 'invalid_request':
      return '请输入有效的用户名和密码。';
    case 'timeout':
      return '连接超时，请检查网络后重试。';
    case 'not_configured':
      return '登录服务尚未配置，请联系维护者。';
    case 'unavailable':
    case 'request_failed':
      return '无法连接登录服务，请检查网络或稍后重试。';
    case 'invalid_response':
      return '登录服务响应异常，请稍后重试。';
    case 'unauthorized':
      return '登录状态已失效，请重新登录。';
  }
}

export interface WorkoutPushEvent {
  id: string;
  type: 'workout_started' | 'workout_completed';
  title: string;
  body: string;
  data: { sessionId: string };
}

export function getRelayBaseUrl(): string {
  const relayUrl = process.env.EXPO_PUBLIC_RELAY_URL?.trim().replace(/\/$/, '');
  if (!relayUrl) {
    throw new AccountApiError('not_configured');
  }
  return relayUrl;
}

function getResponseErrorCode(status: number, responseBody: unknown): AccountApiErrorCode {
  const serviceCode =
    typeof responseBody === 'object' && responseBody !== null && 'error' in responseBody
      ? String(responseBody.error)
      : null;

  if (serviceCode === 'invalid_credentials') {
    return 'invalid_credentials';
  }
  if (serviceCode === 'invalid_request') {
    return 'invalid_request';
  }
  if (serviceCode === 'unauthorized' || serviceCode === 'invalid_refresh_token') {
    return 'unauthorized';
  }
  if (status === 429 || status >= 500) {
    return 'unavailable';
  }
  return 'request_failed';
}

async function postJson(path: string, body: unknown, accessToken?: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${getRelayBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw new AccountApiError(getResponseErrorCode(response.status, responseBody));
    }

    return responseBody;
  } catch (error) {
    if (error instanceof AccountApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AccountApiError('timeout');
    }
    if (error instanceof TypeError) {
      throw new AccountApiError('unavailable');
    }
    throw new AccountApiError('request_failed');
  } finally {
    clearTimeout(timeout);
  }
}

function requireAuthSession(value: unknown): AuthSession {
  const session = parseAuthSession(value);
  if (!session) {
    throw new AccountApiError('invalid_response');
  }
  return session;
}

export async function loginAccount(username: string, password: string): Promise<AuthSession> {
  return requireAuthSession(await postJson('/auth/login', { username, password }));
}

export async function refreshAccount(refreshToken: string): Promise<AuthSession> {
  return requireAuthSession(await postJson('/auth/refresh', { refreshToken }));
}

export async function sendWorkoutPush(
  accessToken: string,
  pushToken: string,
  event: WorkoutPushEvent,
): Promise<void> {
  await postJson('/push', { pushToken, event }, accessToken);
}

export function getRealtimeWebSocketUrl(accessToken: string): string {
  const relayUrl = new URL(getRelayBaseUrl());
  relayUrl.protocol = relayUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  relayUrl.pathname = `${relayUrl.pathname.replace(/\/$/, '')}/realtime`;
  relayUrl.search = `access_token=${encodeURIComponent(accessToken)}`;
  return relayUrl.toString();
}
