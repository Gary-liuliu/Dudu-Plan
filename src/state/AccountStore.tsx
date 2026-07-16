import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  getLoginErrorMessage,
  loginAccount,
  refreshAccount,
} from '../services/accountApi';
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from '../services/authStorage';
import type { AuthSession } from '../types';

interface AccountStoreValue {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  session: AuthSession | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AccountStoreContext = createContext<AccountStoreValue | null>(null);

// [Function] 管理固定账号会话与令牌刷新。[Warning] 登录密码不得持久化或写入日志。
export function AccountStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const replaceSession = useCallback(async (nextSession: AuthSession | null) => {
    if (nextSession) {
      await saveAuthSession(nextSession);
    } else {
      await clearAuthSession();
    }
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  useEffect(() => {
    void loadAuthSession()
      .then((storedSession) => {
        if (storedSession && storedSession.refreshTokenExpiresAt > Date.now()) {
          sessionRef.current = storedSession;
          setSession(storedSession);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        await replaceSession(await loginAccount(username, password));
      } catch (loginError) {
        const message = getLoginErrorMessage(loginError);
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [replaceSession],
  );

  const logout = useCallback(async () => {
    setError(null);
    await replaceSession(null);
  }, [replaceSession]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      return null;
    }

    if (currentSession.accessTokenExpiresAt > Date.now() + 30_000) {
      return currentSession.accessToken;
    }

    if (currentSession.refreshTokenExpiresAt <= Date.now()) {
      await replaceSession(null);
      return null;
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = refreshAccount(currentSession.refreshToken)
        .then(async (refreshedSession) => {
          await replaceSession(refreshedSession);
          return refreshedSession.accessToken;
        })
        .catch(async () => {
          await replaceSession(null);
          return null;
        })
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }

    return refreshPromiseRef.current;
  }, [replaceSession]);

  const value = useMemo<AccountStoreValue>(
    () => ({ hydrated, loading, error, session, login, logout, getAccessToken }),
    [error, getAccessToken, hydrated, loading, login, logout, session],
  );

  return <AccountStoreContext.Provider value={value}>{children}</AccountStoreContext.Provider>;
}

export function useAccountStore(): AccountStoreValue {
  const context = useContext(AccountStoreContext);
  if (!context) {
    throw new Error('useAccountStore must be used within AccountStoreProvider.');
  }
  return context;
}
