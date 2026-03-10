import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../contexts/AuthContext';
import { toErrorMessage } from '../lib/request';
import logo from '../assets/ysp-logo-optimized.png';

interface LocationState {
  from?: {
    pathname?: string;
  };
  backgroundLocation?: unknown;
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile, login, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberUsername, setRememberUsername] = useState(false);
  const locationState = location.state as LocationState | null;
  const hasBackgroundLocation = Boolean(locationState?.backgroundLocation);

  useEffect(() => {
    if (session && profile) {
      const redirectTo = locationState?.from?.pathname ?? '/admin';
      navigate(redirectTo, { replace: true });
    }
  }, [locationState?.from?.pathname, navigate, profile, session]);

  useEffect(() => {
    const remembered = window.localStorage.getItem('ysp.remembered_username');
    if (remembered) {
      setEmail(remembered);
      setRememberUsername(true);
    }
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!loading && session && profile) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const loginError = await login(email, password);
      if (loginError) {
        setError(loginError);
        return;
      }

      if (rememberUsername) {
        window.localStorage.setItem('ysp.remembered_username', email);
      } else {
        window.localStorage.removeItem('ysp.remembered_username');
      }

      navigate('/admin', { replace: true });
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (hasBackgroundLocation) {
      navigate(-1);
      return;
    }

    navigate('/', { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center px-4"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        paddingRight: '1rem',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        paddingLeft: '1rem',
        background: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        className="relative my-auto w-full max-w-[28rem] overflow-y-auto"
        style={{ maxHeight: 'calc(-2rem + 100dvh)' }}
      >
        <div
          className="relative rounded-2xl border-2 bg-white shadow-2xl sm:rounded-3xl"
          style={{
            borderColor: 'rgba(246, 66, 31, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="group absolute right-4 top-4 z-10 rounded-xl border border-black/10 bg-black/5 p-2.5 transition-all duration-300 hover:rotate-90 active:scale-95"
            style={{ backdropFilter: 'blur(10px)' }}
            aria-label="Close login panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-gray-600 transition-transform group-hover:scale-110"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

            <div className="px-6 py-6 text-center sm:px-8 sm:py-7">
              <div className="mb-4 flex justify-center">
                <img
                  src={logo}
                  alt="YSP Logo"
                  className="h-16 w-16 rounded-full object-cover sm:h-20 sm:w-20"
                  loading="lazy"
                  decoding="async"
                  style={{
                    boxShadow: '0 8px 24px rgba(246, 66, 31, 0.3), 0 0 0 3px rgba(246, 66, 31, 0.1)',
                    border: '3px solid white',
                  }}
                />
              </div>
              <h2
                className="mb-1.5"
                style={{
                  fontSize: 'clamp(1.5rem, 4vw,1.5rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'rgb(243, 91, 41)',
                }}
              >
                Youth Service Philippines
              </h2>
            </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 sm:px-8 sm:pb-8">
            {error ? <ErrorState message={error} /> : null}

            <div className="space-y-2">
              <label htmlFor="username" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  style={{ color: 'rgb(238, 135, 36)' }}
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Username
              </label>
              <input
                id="username"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Enter your username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-12 w-full rounded-xl border-2 px-4 text-base text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 sm:h-14"
                style={{ borderColor: 'rgba(246, 66, 31, 0.3)', fontSize: '16px', appearance: 'none' }}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  style={{ color: 'rgb(238, 135, 36)' }}
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-12 w-full rounded-xl border-2 pl-4 pr-12 text-base text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 sm:h-14"
                  style={{ borderColor: 'rgba(246, 66, 31, 0.3)', fontSize: '16px', appearance: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 transition hover:bg-black/5 active:scale-95"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-gray-500"
                    >
                      <path d="M10.733 5.076A10.744 10.744 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-gray-500"
                    >
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 sm:text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 accent-orange-500"
                checked={rememberUsername}
                onChange={(event) => setRememberUsername(event.target.checked)}
              />
              Remember username on this device
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-base"
              style={{
                background: 'linear-gradient(135deg, rgb(246, 66, 31) 0%, rgb(238, 135, 36) 100%)',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(246, 66, 31, 0.3)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" x2="3" y1="12" y2="12" />
              </svg>
              <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
