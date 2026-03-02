import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/ysp-logo-optimized.png';

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: (isActive: boolean) => JSX.Element;
}

const publicLinks: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    shortLabel: 'Home',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    to: '/programs',
    label: 'Programs',
    shortLabel: 'Programs',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m10.065 12.493-6.18 1.318" />
        <path d="m13.56 11.747 4.332-.924" />
        <path d="m16 21-3.105-6.21" />
        <path d="m8 21 3.105-6.21" />
        <circle cx="12" cy="13" r="2" />
      </svg>
    ),
  },
  {
    to: '/membership',
    label: 'Membership and Chapter',
    shortLabel: 'Membership',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20" />
        <path d="M4 20a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9" />
        <path d="M10 5.1a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
  {
    to: '/volunteer',
    label: 'Volunteer Opportunities',
    shortLabel: 'Volunteer',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    to: '/contact',
    label: 'Contact',
    shortLabel: 'Contact',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
    ),
  },
];

const LoginIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" x2="3" y1="12" y2="12" />
  </svg>
);

export const PublicLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { session, profile, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="site-shell">
      <div className="ambient-orb ambient-orb--left animate-blob" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--right animate-blob animation-delay-2000" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--third animate-blob animation-delay-4000" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--fourth animate-blob animation-delay-6000" aria-hidden="true" />

      <section
        aria-label="Notifications alt+T"
        tabIndex={-1}
        aria-live="polite"
        aria-relevant="additions text"
        aria-atomic="false"
        className="sr-only"
      />

      <header className="floating-header motion-enter-fast transition-all duration-300">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center gap-3 px-3 sm:px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-700 transition hover:bg-orange-100 md:hidden"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            )}
          </button>

          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 shadow-sm sm:h-11 sm:w-11">
              {logoError ? (
                <span className="text-xs font-extrabold text-[#f6421f]">YSP</span>
              ) : (
                <img
                  src={logo}
                  alt="Youth Service Philippines"
                  className="h-full w-full rounded-xl object-contain"
                  onError={() => setLogoError(true)}
                />
              )}
            </div>

            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-extrabold text-[#f6421f] sm:text-base">
                Youth Service Philippines
              </p>
            </div>
          </Link>

          <div className="ml-auto hidden items-center gap-2 md:flex">
            <nav className="glass-nav">
              {publicLinks.map((link) => (
                <NavLink key={link.to} to={link.to}>
                  {({ isActive }) => (
                    <span
                      className={`relative flex items-center rounded-xl px-2.5 py-2 text-sm font-medium transition-colors duration-300 lg:px-3 ${
                        isActive
                          ? 'bg-orange-100 text-[#f6421f]'
                          : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
                      }`}
                    >
                      {link.icon(isActive)}
                      <span
                        className={`overflow-hidden transition-all duration-300 ${
                          isActive ? 'ml-2 w-auto opacity-100' : 'ml-0 w-0 opacity-0'
                        }`}
                      >
                        {link.shortLabel}
                      </span>
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {session ? (
              <>
                <NavLink to="/admin" className="btn-ghost">
                  {profile ? 'Admin' : 'Dashboard'}
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    void logout();
                  }}
                  className="btn-primary"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                state={{ backgroundLocation: location }}
                className="btn-primary whitespace-nowrap font-bold"
              >
                <LoginIcon />
                <span>Log In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="motion-menu fixed left-3 right-3 top-[5.25rem] z-40 md:hidden">
          <div className="panel-surface grid gap-2 p-3">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-orange-100 text-[#f6421f]'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`
                }
                onClick={() => setMobileOpen(false)}
              >
                {link.icon(true)}
                {link.label}
              </NavLink>
            ))}

            {session ? (
              <>
                <NavLink
                  to="/admin"
                  className="btn-ghost"
                  onClick={() => setMobileOpen(false)}
                >
                  {profile ? 'Admin' : 'Dashboard'}
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void logout();
                  }}
                  className="btn-primary"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                state={{ backgroundLocation: location }}
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full whitespace-nowrap font-bold"
              >
                <LoginIcon />
                <span>Log In</span>
              </Link>
            )}
          </div>
        </div>
      ) : null}

      <main className="main-content-wrap motion-enter motion-delay-1 transition-all duration-300">
        <Outlet />
      </main>

      <footer className="relative z-0 border-t border-slate-200/80 py-8">
        <div className="content-container text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Youth Service Philippines. All rights reserved.</p>
          <p className="mt-2">Shaping the Future to a Greater Society</p>
        </div>
      </footer>
    </div>
  );
};
