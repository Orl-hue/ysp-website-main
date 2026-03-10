import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/ysp-logo-optimized.png';

interface AdminNavItem {
  to: string;
  label: string;
  shortLabel: string;
  adminOnly: boolean;
  icon: JSX.Element;
}

const adminLinks: AdminNavItem[] = [
  {
    to: '/admin',
    label: 'Dashboard',
    shortLabel: 'Dashboard',
    adminOnly: false,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    to: '/admin/programs',
    label: 'Programs',
    shortLabel: 'Programs',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 5h18" />
        <path d="M3 12h18" />
        <path d="M3 19h18" />
      </svg>
    ),
  },
  {
    to: '/admin/chapters',
    label: 'Chapters',
    shortLabel: 'Chapters',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 21h20" />
        <path d="M5 21V7l7-4 7 4v14" />
      </svg>
    ),
  },
  {
    to: '/admin/volunteer-opportunities',
    label: 'Volunteer Opportunities',
    shortLabel: 'Volunteer',
    adminOnly: false,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    to: '/admin/volunteer-signups',
    label: 'Volunteer Signups',
    shortLabel: 'Signups',
    adminOnly: false,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
        <path d="M6 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3z" />
        <path d="M16 13c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        <path d="M6 14c-.29 0-.62 0-1 .05A4.48 4.48 0 0 0 2 18v1h4" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    label: 'User Access',
    shortLabel: 'Users',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="4" />
        <path d="M17 11v-1a4 4 0 0 0-4-4" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="16" y1="11" x2="22" y2="11" />
      </svg>
    ),
  },
  {
    to: '/admin/contact',
    label: 'Contact',
    shortLabel: 'Contact',
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
    ),
  },
];

export const AdminLayout = () => {
  const { profile, session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const links = adminLinks.filter((item) => !item.adminOnly || isAdmin);
  const activeLink =
    links.find((link) =>
      location.pathname === link.to ||
      (link.to !== '/admin' && location.pathname.startsWith(`${link.to}/`))
    ) ?? null;
  const pageTitle = activeLink?.label ?? 'Dashboard';
  const roleLabel = isAdmin ? 'Administrator' : 'Chapter Head';
  const roleSubLabel = isAdmin
    ? 'Manage all portal sections and content.'
    : 'Manage your chapter data and opportunities.';

  const handleLogout = () => {
    navigate('/', { replace: true });
    window.setTimeout(() => {
      void logout();
    }, 0);
  };

  return (
    <div className="site-shell admin-shell-bg">
      <div className="w-full px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[#f4f6f2] shadow-[0_30px_70px_-40px_rgba(15,23,42,0.35)]">
          <div className="pointer-events-none absolute -top-24 right-[-90px] h-56 w-56 rounded-full bg-orange-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-[-90px] h-56 w-56 rounded-full bg-orange-200/35 blur-3xl" />

          <div className="grid min-h-[calc(100vh-1rem)] lg:grid-cols-[275px,1fr]">
            <aside className="hidden border-r border-slate-200/80 bg-white/75 p-6 backdrop-blur lg:flex lg:flex-col">
              <Link to="/admin" className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {logoError ? (
                    <span className="text-sm font-extrabold text-[#f6421f]">YSP</span>
                  ) : (
                    <img
                      src={logo}
                      alt="Youth Service Philippines"
                      className="h-full w-full rounded-2xl object-contain"
                      onError={() => setLogoError(true)}
                    />
                  )}
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-900">YSP Portal</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {roleLabel}
                  </p>
                </div>
              </Link>

              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Overview</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{roleSubLabel}</p>
              </div>

              <nav className="mt-6 space-y-1.5">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/admin'}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-orange-50 text-orange-700 shadow-[0_10px_25px_-20px_rgba(249,115,22,0.55)] ring-1 ring-orange-200'
                          : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700'
                      }`
                    }
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-slate-200">
                      {link.icon}
                    </span>
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {session?.user.email ?? 'Signed in user'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Secure dashboard session</p>
                <button
                  type="button"
                  onClick={() => {
                    void handleLogout();
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <header className="motion-enter-fast border-b border-slate-200/80 bg-white/75 p-3 backdrop-blur sm:p-4 lg:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 lg:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileOpen((prev) => !prev)}
                      aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                      aria-expanded={mobileOpen}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-700 transition hover:bg-orange-100"
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
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                      {roleLabel}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h1 className="truncate font-display text-xl font-bold text-slate-900 sm:text-2xl">
                      {pageTitle}
                    </h1>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:inline-flex">
                      {new Date().toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void handleLogout();
                      }}
                      className="btn-primary px-3 py-2 text-xs sm:hidden"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                {mobileOpen ? (
                  <nav className="motion-menu mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 lg:hidden">
                    {links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === '/admin'}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            isActive
                              ? 'bg-orange-500 text-white'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`
                        }
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.icon}
                        {link.label}
                      </NavLink>
                    ))}
                  </nav>
                ) : null}
              </header>

              <main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">
                <div className="admin-page-shell rise-in h-full">
                  <Outlet />
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
