import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChaptersGrid } from '../components/ChaptersGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { retryWithTimeout, toErrorMessage } from '../lib/request';
import { formatSupabaseErrorMessage } from '../lib/supabaseErrors';
import logo from '../assets/ysp-logo-optimized.png';
import { supabase } from '../lib/supabaseClient';
import type { TableRow } from '../types/database';
import { formatDate } from '../utils/format';

const advocacyText = `Section 3. YSP shall be guided by the following advocacy pillars:

1.) Global Citizenship and Governance. To promote leadership skills and democratic values, encouraging active civic participation and informed decision-making in the community;
2.) Ecological and Livelihood Sustainability: This advocacy aims to foster sustainable practices that protect the environment while supporting the economic well-being of communities;
3.) Learning and Development: This area focuses on enhancing educational opportunities and personal growth;
4.) Humanitarian Service: Dedicated to providing aid and support to those in need through relief, wellness, and recovery initiatives.`;

export const HomePage = () => {
  const location = useLocation();
  const { session, profile } = useAuth();
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TableRow<'site_stats'> | null>(null);
  const [programs, setPrograms] = useState<TableRow<'programs'>[]>([]);
  const [chapters, setChapters] = useState<TableRow<'chapters'>[]>([]);

  useEffect(() => {
    let isMounted = true;
    let hardStopTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      if (!supabase) {
        setError('Supabase is not configured. Add your environment variables first.');
        setProjectsLoading(false);
        setChaptersLoading(false);
        return;
      }
      const client = supabase;

      setProjectsLoading(true);
      setChaptersLoading(true);
      setError(null);
      hardStopTimer = setTimeout(() => {
        if (isMounted) {
          setProjectsLoading(false);
          setChaptersLoading(false);
          setError((current) =>
            current ??
            'Loading is taking too long. Check your internet and Supabase connection, then refresh.'
          );
        }
      }, 12000);

      try {
        const [statsResult, programsResult, chaptersResult] = await Promise.allSettled([
          retryWithTimeout(
            () => client.from('site_stats').select('*').order('updated_at', { ascending: false }).limit(1),
            {
              attempts: 2,
              timeoutMs: 10000,
              timeoutMessage: 'Request timed out while loading home stats.',
            }
          ),
          retryWithTimeout(
            () => client.from('programs').select('*').order('created_at', { ascending: false }).limit(10),
            {
              attempts: 2,
              timeoutMs: 10000,
              timeoutMessage: 'Request timed out while loading projects.',
            }
          ),
          retryWithTimeout(
            () => client.from('chapters').select('*').order('name', { ascending: true }),
            {
              attempts: 2,
              timeoutMs: 10000,
              timeoutMessage: 'Request timed out while loading chapters.',
            }
          ),
        ]);

        if (!isMounted) {
          return;
        }

        let firstErrorMessage: string | null = null;

        if (statsResult.status === 'fulfilled') {
          if (statsResult.value.error) {
            firstErrorMessage = formatSupabaseErrorMessage(statsResult.value.error.message);
            setStats(null);
          } else {
            setStats((statsResult.value.data?.[0] as TableRow<'site_stats'> | undefined) ?? null);
          }
        } else {
          firstErrorMessage = formatSupabaseErrorMessage(toErrorMessage(statsResult.reason));
          setStats(null);
        }

        if (programsResult.status === 'fulfilled') {
          if (programsResult.value.error) {
            firstErrorMessage =
              firstErrorMessage ?? formatSupabaseErrorMessage(programsResult.value.error.message);
            setPrograms([]);
          } else {
            setPrograms((programsResult.value.data as TableRow<'programs'>[] | null) ?? []);
          }
        } else {
          firstErrorMessage =
            firstErrorMessage ?? formatSupabaseErrorMessage(toErrorMessage(programsResult.reason));
          setPrograms([]);
        }

        if (chaptersResult.status === 'fulfilled') {
          if (chaptersResult.value.error) {
            firstErrorMessage =
              firstErrorMessage ?? formatSupabaseErrorMessage(chaptersResult.value.error.message);
            setChapters([]);
          } else {
            setChapters((chaptersResult.value.data as TableRow<'chapters'>[] | null) ?? []);
          }
        } else {
          firstErrorMessage =
            firstErrorMessage ?? formatSupabaseErrorMessage(toErrorMessage(chaptersResult.reason));
          setChapters([]);
        }

        if (firstErrorMessage) {
          setError(firstErrorMessage);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        setError(formatSupabaseErrorMessage(toErrorMessage(loadError)));
        setStats(null);
        setPrograms([]);
        setChapters([]);
      } finally {
        if (hardStopTimer) {
          clearTimeout(hardStopTimer);
        }
        if (isMounted) {
          setProjectsLoading(false);
          setChaptersLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
      if (hardStopTimer) {
        clearTimeout(hardStopTimer);
      }
    };
  }, []);

  const projectCards = useMemo(() => programs.slice(0, 8), [programs]);

  const isSignedIn = Boolean(session);
  const hasAdminAccess = Boolean(profile);

  return (
    <div className="content-container motion-stagger flex flex-col gap-8 pb-2 md:gap-10">
      <section id="home" className="relative px-1 pb-12 pt-3 text-center md:pb-16 md:pt-8">
        <div className="mx-auto max-w-4xl">
          <img
            src={logo}
            alt="YSP Logo"
            className="mx-auto mb-5 h-20 w-20 rounded-2xl bg-white/80 p-1 shadow-sm sm:h-24 sm:w-24"
            loading="eager"
          />

          <h1 className="text-3xl font-extrabold tracking-tight text-[#f6421f] sm:text-4xl lg:text-5xl">
            Welcome to Youth Service Philippines
            <br />
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Shaping the Future to a Greater Society
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isSignedIn ? (
              <Link
                to="/admin"
                className="btn-primary h-12 w-full whitespace-nowrap px-6 text-base font-bold sm:w-44"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                <span>{hasAdminAccess ? 'Dashboard' : 'Resume Admin'}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                state={{ backgroundLocation: location }}
                className="btn-primary h-12 w-full whitespace-nowrap px-6 text-base font-bold sm:w-44"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" x2="3" y1="12" y2="12" />
                </svg>
                <span>Log In</span>
              </Link>
            )}
            <Link to="/volunteer" className="btn-secondary h-12 w-full px-5 text-base sm:w-44">
              Opportunities!
            </Link>
          </div>

          {isSignedIn && !hasAdminAccess ? (
            <p className="mt-3 text-sm font-medium text-slate-600">
              Signed in. Re-checking admin access...
            </p>
          ) : null}
        </div>
      </section>

      <section id="about" className="ysp-card p-6 md:p-8">
        <h2 className="mb-4 text-left text-2xl font-extrabold text-[#f6421f]">About Us</h2>
        <p className="text-justify text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
          Youth Service Philippines (YSP) was born from the need for youth-centric initiatives.
          Starting as a small youth-led initiative in 2016, YSP has grown into a nationwide movement
          championing youth empowerment and community growth. Today, YSP continues to lead projects
          in education, peacebuilding, and disaster response with active chapters across Luzon,
          Visayas, and Mindanao.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <article className="panel-soft p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Projects</p>
            <p className="mt-1 text-3xl font-extrabold text-[#f6421f]">{stats?.projects_count ?? 0}</p>
          </article>
          <article className="panel-soft p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Chapters</p>
            <p className="mt-1 text-3xl font-extrabold text-[#f6421f]">{stats?.chapters_count ?? 0}</p>
          </article>
          <article className="panel-soft p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Members</p>
            <p className="mt-1 text-3xl font-extrabold text-[#f6421f]">{stats?.members_count ?? 0}</p>
          </article>
        </div>
      </section>

      <section className="ysp-card p-6 md:p-8">
        <h2 className="mb-4 text-left text-2xl font-extrabold text-[#f6421f]">Our Mission</h2>
        <p className="text-justify text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
          YSP empowers young leaders to drive sustainable community development, forging inclusive
          partnerships for positive transformative change.
        </p>
      </section>

      <section className="ysp-card p-6 md:p-8">
        <h2 className="mb-4 text-left text-2xl font-extrabold text-[#f6421f]">Our Vision</h2>
        <p className="text-justify text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
          YSP actively fosters civic engagement, collaboration, and capacity building to drive
          contextualized, community-led development initiatives through leadership, co-creation,
          and the values of pakikipag-kapwa and damayan for sustainable growth.
        </p>
      </section>

      <section className="ysp-card p-6 md:p-8">
        <h2 className="mb-4 text-left text-2xl font-extrabold text-[#f6421f]">Our Advocacy Pillars</h2>
        <div className="whitespace-pre-wrap text-justify text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
          {advocacyText}
        </div>
      </section>

      {error ? <ErrorState message={error} /> : null}

      <section id="projects" className="ysp-card p-6 md:p-8">
        <div className="section-header">
          <h2 className="text-2xl font-extrabold text-[#f6421f]">Projects Implemented</h2>
          <Link to="/programs" className="btn-ghost">
            View all
          </Link>
        </div>

        {projectsLoading ? (
          <div className="mt-4">
            <LoadingState label="Loading projects..." />
          </div>
        ) : projectCards.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No programs yet" description="Admin can add programs from the dashboard." />
          </div>
        ) : (
          <div className="ysp-scroll mt-4 flex gap-6 overflow-x-auto pb-2">
            {projectCards.map((program) => (
              <article
                key={program.id}
                className="w-[340px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm transition hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="h-48 w-full overflow-hidden bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100">
                  {program.image_url ? (
                    <img
                      src={program.image_url}
                      alt={program.title}
                      className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-[#f6421f]">
                      Program image pending
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-4">
                  <h3 className="line-clamp-2 text-lg font-extrabold text-[#f6421f]">{program.title}</h3>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {formatDate(program.created_at)}
                  </p>
                  <p className="line-clamp-3 text-sm text-slate-600">{program.description}</p>
                  <Link
                    to={`/programs/${program.slug || program.id}`}
                    className="inline-flex text-sm font-semibold text-[#f6421f] hover:underline"
                  >
                    Read details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel-surface space-y-5 p-6 sm:p-8">
        <div>
          <span className="eyebrow">Chapter Network</span>
          <h2 className="section-title mt-2">Active Chapters</h2>
          <p className="section-lead mt-1">Youth leaders coordinating service projects in different areas.</p>
        </div>

        {chaptersLoading ? (
          <LoadingState label="Loading chapters..." />
        ) : chapters.length === 0 ? (
          <EmptyState title="No chapters listed" description="Chapter records will appear here once added." />
        ) : (
          <ChaptersGrid chapters={chapters} />
        )}
      </section>

    </div>
  );
};
