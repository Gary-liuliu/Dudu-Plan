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
  AccountApiError,
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
  getAccessToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AccountStoreContext = createContext<AccountStoreValue | null>(null);

// [Function] 管理固定账号会话与令牌刷新。[Warning] 登录密码不得持久化或写入日志。
export function AccountStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  const sessionGenerationRef = useRef(0);
  const sessionWriteRef = useRef<Promise<void>>(Promise.resolve());
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const replaceSession = useCallback(async (nextSession: AuthSession | null) => {
    const previousSession = sessionRef.current;
    const generation = sessionGenerationRef.current + 1;
    sessionGenerationRef.current = generation;
    sessionRef.current = nextSession;

    const write = sessionWriteRef.current
      .catch(() => undefined)
      .then(() => nextSession ? saveAuthSession(nextSession) : clearAuthSession());
    sessionWriteRef.current = write.catch(() => undefined);

    try {
      await write;
    } catch (writeError) {
      if (sessionGenerationRef.current === generation) {
        sessionRef.current = previousSession;
        setSession(previousSession);
      }
      throw writeError;
    }
    if (sessionGenerationRef.current === generation) {
      setSession(nextSession);
    }
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

  const getAccessToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      return null;
    }

    if (!forceRefresh && currentSession.accessTokenExpiresAt > Date.now() + 30_000) {
      return currentSession.accessToken;
    }

    if (currentSession.refreshTokenExpiresAt <= Date.now()) {
      await replaceSession(null);
      return null;
    }

    if (!refreshPromiseRef.current) {
      const sessionBeingRefreshed = currentSession;
      refreshPromiseRef.current = refreshAccount(currentSession.refreshToken)
        .then(async (refreshedSession) => {
          if (sessionRef.current !== sessionBeingRefreshed) {
            return null;
          }
          await replaceSession(refreshedSession);
          return refreshedSession.accessToken;
        })
        .catch(async (refreshError) => {
          if (sessionRef.current !== sessionBeingRefreshed) {
            return null;
          }
          if (refreshError instanceof AccountApiError && refreshError.code === 'unauthorized') {
            await replaceSession(null);
          }
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
