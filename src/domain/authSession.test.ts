import { parseAuthSession } from './authSession';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

const validSession = parseAuthSession({
  accountName: '嘟嘟',
  role: 'owner',
  accessToken: 'access',
  refreshToken: 'refresh',
  accessTokenExpiresAt: 100,
  refreshTokenExpiresAt: 200,
});
assertEqual(validSession?.role, 'owner', '有效登录会话应被接受');
assertEqual(parseAuthSession({ role: 'owner' }), null, '缺少令牌的会话应被拒绝');
assertEqual(
  parseAuthSession({ ...validSession, accountName: '未知账号' }),
  null,
  '未知账号不得恢复登录',
);
assertEqual(
  parseAuthSession({ ...validSession, accountName: '肚肚' }),
  null,
  '肚肚账号不得恢复为嘟嘟角色',
);
assertEqual(
  parseAuthSession({ ...validSession, accessToken: '' }),
  null,
  '空令牌不得恢复登录',
);
