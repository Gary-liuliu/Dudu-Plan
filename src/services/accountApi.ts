import { parseAuthSession } from '../domain/authSession';
import type { AuthSession, ChatMessage } from '../types';

const requestTimeoutMs = 12_000;

export type AccountApiErrorCode =
  | 'invalid_credentials'
  | 'invalid_request'
  | 'invalid_response'
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
    case 'unavailable':
    case 'request_failed':
      return '无法连接登录服务，请检查网络或稍后重试。';
    case 'invalid_response':
      return '登录服务响应异常，请稍后重试。';
    case 'unauthorized':
      return '登录状态已失效，请重新登录。';
  }
}

export const duduPlanApiBaseUrl = 'https://kakaweb.ltd/api/dudu-plan';

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

async function requestJson(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; accessToken?: string } = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${duduPlanApiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
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
    throw new AccountApiError(error instanceof TypeError ? 'unavailable' : 'request_failed');
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
  return requireAuthSession(await requestJson('/auth/login', {
    method: 'POST',
    body: { username, password },
  }));
}

export async function refreshAccount(refreshToken: string): Promise<AuthSession> {
  return requireAuthSession(await requestJson('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  }));
}

export async function getChatMessages(
  accessToken: string,
  beforeId?: number,
  limit = 50,
): Promise<{ items: ChatMessage[]; nextCursor: number | null }> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (beforeId) {
    query.set('beforeId', String(beforeId));
  }
  const response = await requestJson(`/chat/messages?${query.toString()}`, { accessToken });
  if (typeof response !== 'object' || response === null || !('items' in response)) {
    throw new AccountApiError('invalid_response');
  }
  const value = response as { items?: unknown; nextCursor?: unknown };
  if (!Array.isArray(value.items)) {
    throw new AccountApiError('invalid_response');
  }
  return {
    items: value.items as ChatMessage[],
    nextCursor: typeof value.nextCursor === 'number' ? value.nextCursor : null,
  };
}

export async function getChatUnreadCount(accessToken: string): Promise<number> {
  const response = await requestJson('/chat/unread-count', { accessToken });
  if (
    typeof response !== 'object' || response === null ||
    !('unreadCount' in response) || typeof response.unreadCount !== 'number'
  ) {
    throw new AccountApiError('invalid_response');
  }
  return response.unreadCount;
}

export async function markChatDelivered(
  accessToken: string,
  messageIds: string[],
): Promise<ChatMessage[]> {
  const response = await requestJson('/chat/delivered', {
    method: 'POST', accessToken, body: { messageIds },
  });
  if (typeof response !== 'object' || response === null || !('items' in response)) {
    throw new AccountApiError('invalid_response');
  }
  const items = (response as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    throw new AccountApiError('invalid_response');
  }
  return items as ChatMessage[];
}

export async function markChatRead(
  accessToken: string,
  upToMessageId: string,
): Promise<void> {
  await requestJson('/chat/read', {
    method: 'POST', accessToken, body: { upToMessageId },
  });
}

export async function recallChatMessage(
  accessToken: string,
  messageId: string,
): Promise<ChatMessage> {
  return await requestJson(`/chat/messages/${encodeURIComponent(messageId)}/recall`, {
    method: 'POST', accessToken, body: {},
  }) as ChatMessage;
}

export function getRealtimeWebSocketUrl(): string {
  const relayUrl = new URL(duduPlanApiBaseUrl);
  relayUrl.protocol = relayUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  relayUrl.pathname = `${relayUrl.pathname.replace(/\/$/, '')}/realtime`;
  relayUrl.search = '';
  return relayUrl.toString();
}
