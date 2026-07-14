import {
  AccountApiError,
  getLoginErrorMessage,
} from './accountApi';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

assertEqual(
  getLoginErrorMessage(new AccountApiError('invalid_credentials')),
  '用户名或密码错误。',
  '错误账号信息应显示统一提示',
);
assertEqual(
  getLoginErrorMessage(new AccountApiError('timeout')),
  '连接超时，请检查网络后重试。',
  '请求超时应提示检查网络',
);
assertEqual(
  getLoginErrorMessage(new AccountApiError('unavailable')),
  '无法连接登录服务，请检查网络或稍后重试。',
  '中继不可用应显示可操作提示',
);
assertEqual(
  getLoginErrorMessage(new AccountApiError('not_configured')),
  '登录服务尚未配置，请联系维护者。',
  '缺少中继地址应显示配置提示',
);
assertEqual(
  getLoginErrorMessage(new Error('raw service details')),
  '登录失败，请稍后重试。',
  '未知错误不得透传原始内容',
);
