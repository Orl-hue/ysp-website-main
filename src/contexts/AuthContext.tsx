import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { retryWithTimeout, toErrorMessage } from '../lib/request';
import { supabase } from '../lib/supabaseClient';
import type { TableRow, UserRole } from '../types/database';

type Profile = TableRow<'profiles'>;
const PROFILE_TIMEOUT_MS = 25000;
const SESSION_TIMEOUT_MS = 25000;
const SIGN_IN_TIMEOUT_MS = 30000;
const AUTH_RETRY_ATTEMPTS = 2;
const PROFILE_RETRY_ATTEMPTS = 3;
const PROFILE_CACHE_KEY = 'ysp.auth.profile_cache';
const isTimeoutMessage = (message: string): boolean =>
  message.toLowerCase().includes('timed out');
const isInvalidRefreshTokenError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('invalid refresh token') ||
    normalized.includes('refresh token not found')
  );
};
const isRecoverableProfileError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('timed out') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed')
  );
};

const readCachedProfile = (userId: string): Profile | null => {
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<Profile> | null;
    if (!parsed || parsed.id !== userId || !hasRoleAccess(parsed.role)) {
      return null;
    }

    return {
      id: parsed.id,
      role: parsed.role,
      chapter_id: typeof parsed.chapter_id === 'string' ? parsed.chapter_id : null,
      created_at: typeof parsed.created_at === 'string' ? parsed.created_at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const saveCachedProfile = (nextProfile: Profile): void => {
  try {
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(nextProfile));
  } catch {
    // Best-effort cache only.
  }
};

const clearCachedProfile = (): void => {
  try {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

const normalizeLoginError = (message: string): string => {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Email is not confirmed. Confirm this user in Supabase Auth, then sign in again.';
  }

  if (
    lower.includes('timed out') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror')
  ) {
    return 'Cannot reach Supabase Auth. Check internet/proxy/VPN/firewall, then try again.';
  }

  return message;
};

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const hasRoleAccess = (role: string | undefined): role is UserRole => {
  return role === 'admin' || role === 'chapter_head';
};

interface ProfileLoadResult {
  profile: Profile | null;
  errorMessage: string | null;
}

const loadProfile = async (
  client: NonNullable<typeof supabase>,
  userId: string
): Promise<ProfileLoadResult> => {
  try {
    const { data, error } = await retryWithTimeout(
      () =>
        client
          .from('profiles')
          .select('id, role, chapter_id, created_at')
          .eq('id', userId)
          .maybeSingle(),
      {
        attempts: PROFILE_RETRY_ATTEMPTS,
        timeoutMs: PROFILE_TIMEOUT_MS,
        timeoutMessage: 'Profile request timed out.',
      }
    );

    if (error) {
      return { profile: null, errorMessage: error.message };
    }

    if (!data || !hasRoleAccess(data.role)) {
      return { profile: null, errorMessage: null };
    }

    return { profile: data as Profile, errorMessage: null };
  } catch (error) {
    return { profile: null, errorMessage: toErrorMessage(error) };
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionResolvedRef = useRef(false);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let hardStopTimer: ReturnType<typeof setTimeout> | null = null;

    const bootstrap = async () => {
      sessionResolvedRef.current = false;
      hardStopTimer = setTimeout(() => {
        if (isMounted && !sessionResolvedRef.current) {
          setLoading(false);
        }
      }, 15000);

      try {
        const { data, error } = await retryWithTimeout(
          () => client.auth.getSession(),
          {
            attempts: AUTH_RETRY_ATTEMPTS,
            timeoutMs: SESSION_TIMEOUT_MS,
            timeoutMessage: 'Session request timed out.',
          }
        );

        if (!isMounted) {
          return;
        }

        if (error) {
          if (isInvalidRefreshTokenError(error.message)) {
            // Self-heal stale/rotated refresh tokens from previous sessions.
            await client.auth.signOut({ scope: 'local' });
            clearCachedProfile();
            setSession(null);
            setProfile(null);
            sessionResolvedRef.current = true;
            return;
          }
          console.error('Failed to load session:', error.message);
        }

        const nextSession = data.session;
        sessionResolvedRef.current = true;
        setSession(nextSession);

        if (nextSession) {
          const { profile: nextProfile, errorMessage } = await loadProfile(
            client,
            nextSession.user.id
          );

          let resolvedProfile = nextProfile;
          if (!resolvedProfile && errorMessage && isRecoverableProfileError(errorMessage)) {
            resolvedProfile = readCachedProfile(nextSession.user.id);
          }

          if (resolvedProfile) {
            saveCachedProfile(resolvedProfile);
          } else if (errorMessage && !isTimeoutMessage(errorMessage)) {
            console.error('Failed to load user profile:', errorMessage);
          }

          if (isMounted) {
            setProfile(resolvedProfile);
          }
        } else {
          clearCachedProfile();
          setProfile(null);
        }
      } catch (error) {
        sessionResolvedRef.current = true;
        if (isMounted) {
          const message = toErrorMessage(error);
          if (isInvalidRefreshTokenError(message)) {
            await client.auth.signOut({ scope: 'local' });
            clearCachedProfile();
            setSession(null);
            setProfile(null);
            return;
          }
          if (!isTimeoutMessage(message)) {
            console.error('Failed to load session:', message);
          }
        }
      } finally {
        if (hardStopTimer) {
          clearTimeout(hardStopTimer);
        }
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        try {
          setSession(nextSession);

          if (nextSession) {
            const { profile: nextProfile, errorMessage } = await loadProfile(
              client,
              nextSession.user.id
            );

            if (errorMessage) {
              if (isRecoverableProfileError(errorMessage)) {
                const cachedProfile = readCachedProfile(nextSession.user.id);
                if (cachedProfile) {
                  setProfile(cachedProfile);
                  return;
                }
              }

              if (!isTimeoutMessage(errorMessage)) {
                console.error('Failed to load user profile:', errorMessage);
              }
              setProfile(null);
              return;
            }

            if (nextProfile) {
              saveCachedProfile(nextProfile);
            }
            setProfile(nextProfile);
          } else {
            clearCachedProfile();
            setProfile(null);
          }
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => {
      isMounted = false;
      if (hardStopTimer) {
        clearTimeout(hardStopTimer);
      }
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const client = supabase;
    if (!client) {
      return 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
    }

    try {
      const { data, error } = await retryWithTimeout(
        () =>
          client.auth.signInWithPassword({
            email: email.trim(),
            password,
          }),
        {
          attempts: AUTH_RETRY_ATTEMPTS,
          timeoutMs: SIGN_IN_TIMEOUT_MS,
          timeoutMessage: 'Sign-in request timed out. Please try again.',
        }
      );

      if (error || !data.session) {
        return normalizeLoginError(error?.message ?? 'Invalid credentials.');
      }

      const { profile: nextProfile, errorMessage } = await loadProfile(
        client,
        data.session.user.id
      );

      if (errorMessage) {
        return normalizeLoginError(errorMessage);
      }

      if (!nextProfile) {
        await client.auth.signOut();
        setSession(null);
        setProfile(null);
        clearCachedProfile();
        return 'Your account is not assigned as admin or chapter_head in profiles.';
      }

      setSession(data.session);
      setProfile(nextProfile);
      saveCachedProfile(nextProfile);
      return null;
    } catch (error) {
      const message = toErrorMessage(error);

      // Recovery path: sign-in can complete after timeout on slow/cold projects.
      if (message.toLowerCase().includes('timed out')) {
        try {
          const { data: sessionData } = await retryWithTimeout(
            () => client.auth.getSession(),
            {
              attempts: AUTH_RETRY_ATTEMPTS,
              timeoutMs: 10000,
              timeoutMessage: 'Session check timed out.',
            }
          );

          if (sessionData.session) {
            const { profile: nextProfile, errorMessage } = await loadProfile(
              client,
              sessionData.session.user.id
            );
            if (errorMessage) {
              return normalizeLoginError(errorMessage);
            }
            if (!nextProfile) {
              await client.auth.signOut();
              setSession(null);
              setProfile(null);
              clearCachedProfile();
              return 'Signed in but your account is not assigned as admin or chapter_head in profiles.';
            }

            setSession(sessionData.session);
            setProfile(nextProfile);
            saveCachedProfile(nextProfile);
            return null;
          }
        } catch {
          // Fall through to original timeout message.
        }
      }

      return normalizeLoginError(message);
    }
  }, []);

  const logout = useCallback(async () => {
    // Always clear local UI state immediately so logout feels instant.
    setSession(null);
    setProfile(null);
    clearCachedProfile();

    const client = supabase;
    if (client) {
      try {
        const { error } = await retryWithTimeout(
          () => client.auth.signOut({ scope: 'local' }),
          {
            attempts: AUTH_RETRY_ATTEMPTS,
            timeoutMs: 8000,
            timeoutMessage: 'Sign-out request timed out.',
          }
        );

        if (error) {
          if (!isTimeoutMessage(error.message)) {
            console.error('Failed to sign out:', error.message);
          }
        }
      } catch (error) {
        const message = toErrorMessage(error);
        if (!isTimeoutMessage(message)) {
          console.error('Failed to sign out:', message);
        }
      }
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      profile,
      loading,
      login,
      logout,
    };
  }, [loading, login, logout, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
};
