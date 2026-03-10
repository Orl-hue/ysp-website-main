import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { retryWithTimeout, toErrorMessage } from '../lib/request';
import { formatSupabaseErrorMessage } from '../lib/supabaseErrors';
import { supabase } from '../lib/supabaseClient';
import type { TableRow } from '../types/database';
import eventCardImage from '../assets/ysp-image-optimized.jpg';

type DateFilter = 'all' | 'upcoming' | 'this_month';
type SignupRow = Pick<TableRow<'volunteer_signups'>, 'opportunity_id' | 'email'>;

const memberFormUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLSdwMKgIjQNrlLH-j-Qdx0MrKxefxaLRC6gMI_oOgMTosDi_sQ/viewform';

const opportunityIdEntry = import.meta.env.VITE_GOOGLE_FORM_OPPORTUNITY_ID_ENTRY;
const eventNameEntry = import.meta.env.VITE_GOOGLE_FORM_EVENT_NAME_ENTRY;
const emailEntry = import.meta.env.VITE_GOOGLE_FORM_EMAIL_ENTRY;

const normalizeEmail = (value: string | null | undefined): string => {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
};

const sanitizeGoogleEntryKey = (value: string | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return /^entry\.\d+$/.test(trimmed) ? trimmed : null;
};

const isVolunteerSignupTableMissing = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('volunteer_signups') &&
    (normalized.includes('not found') ||
      normalized.includes('does not exist') ||
      normalized.includes('could not find the table'))
  );
};

const buildVolunteerSignupUrl = (
  opportunityId: string,
  eventName: string,
  email: string | null | undefined
): string => {
  const opportunityEntryKey = sanitizeGoogleEntryKey(opportunityIdEntry);
  const eventEntryKey = sanitizeGoogleEntryKey(eventNameEntry);
  const emailEntryKey = sanitizeGoogleEntryKey(emailEntry);
  const nextUrl = new URL(memberFormUrl);

  if (opportunityEntryKey) {
    nextUrl.searchParams.set(opportunityEntryKey, opportunityId);
  }
  if (eventEntryKey) {
    nextUrl.searchParams.set(eventEntryKey, eventName);
  }
  if (emailEntryKey && normalizeEmail(email).length > 0) {
    nextUrl.searchParams.set(emailEntryKey, normalizeEmail(email));
  }

  return nextUrl.toString();
};

export const VolunteerPage = () => {
  const { session } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<TableRow<'volunteer_opportunities'>[]>([]);
  const [chapters, setChapters] = useState<TableRow<'chapters'>[]>([]);
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [isSignupSyncAvailable, setIsSignupSyncAvailable] = useState(true);

  const [search, setSearch] = useState('');
  const [chapterFilter, setChapterFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sdgFilter, setSdgFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;
    let hardStopTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }
      const client = supabase;
      setLoading(true);

      hardStopTimer = setTimeout(() => {
        if (isMounted) {
          setLoading(false);
        }
      }, 12000);

      try {
        const [opportunitiesRes, chaptersRes, signupsRes] = await retryWithTimeout(
          () =>
            Promise.all([
              client
                .from('volunteer_opportunities')
                .select('*')
                .order('event_date', { ascending: true }),
              client.from('chapters').select('*').order('name', { ascending: true }),
              client.from('volunteer_signups').select('opportunity_id, email'),
            ]),
          {
            attempts: 2,
            timeoutMs: 10000,
            timeoutMessage: 'Request timed out while loading volunteer opportunities.',
          }
        );

        if (!isMounted) {
          return;
        }

        const firstError = opportunitiesRes.error ?? chaptersRes.error;
        if (firstError) {
          setError(formatSupabaseErrorMessage(firstError.message));
        }

        setOpportunities(
          (opportunitiesRes.data as TableRow<'volunteer_opportunities'>[] | null) ?? []
        );
        setChapters((chaptersRes.data as TableRow<'chapters'>[] | null) ?? []);

        if (signupsRes.error) {
          if (isVolunteerSignupTableMissing(signupsRes.error.message)) {
            setIsSignupSyncAvailable(false);
            setSignups([]);
          } else {
            setIsSignupSyncAvailable(false);
            if (!firstError) {
              setError(formatSupabaseErrorMessage(signupsRes.error.message));
            }
          }
        } else {
          setIsSignupSyncAvailable(true);
          setSignups((signupsRes.data as SignupRow[] | null) ?? []);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        const message = toErrorMessage(loadError);
        const normalized = message.toLowerCase();
        if (normalized.includes('404') || normalized.includes('not found')) {
          setError(
            "Supabase is missing public.volunteer_opportunities. Run supabase/fix-volunteer-opportunities.sql in Supabase SQL Editor, then refresh."
          );
        } else {
          setError(formatSupabaseErrorMessage(message));
        }
        setOpportunities([]);
        setChapters([]);
        setSignups([]);
        setIsSignupSyncAvailable(false);
      } finally {
        if (hardStopTimer) {
          clearTimeout(hardStopTimer);
        }
        if (isMounted) {
          setLoading(false);
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

  const chapterMap = useMemo(() => {
    const map = new Map<string, TableRow<'chapters'>>();
    chapters.forEach((chapter) => {
      map.set(chapter.id, chapter);
    });
    return map;
  }, [chapters]);

  const signupCountByOpportunity = useMemo(() => {
    const counts = new Map<string, number>();
    signups.forEach((signup) => {
      const nextCount = (counts.get(signup.opportunity_id) ?? 0) + 1;
      counts.set(signup.opportunity_id, nextCount);
    });
    return counts;
  }, [signups]);

  const normalizedUserEmail = useMemo(() => {
    return normalizeEmail(session?.user.email);
  }, [session?.user.email]);

  const signedUpOpportunityIds = useMemo(() => {
    const signedUpIds = new Set<string>();
    if (normalizedUserEmail.length === 0) {
      return signedUpIds;
    }

    signups.forEach((signup) => {
      if (normalizeEmail(signup.email) === normalizedUserEmail) {
        signedUpIds.add(signup.opportunity_id);
      }
    });

    return signedUpIds;
  }, [normalizedUserEmail, signups]);

  const locationOptions = useMemo(() => {
    const unique = new Set<string>();
    chapters.forEach((chapter) => {
      const location = chapter.location?.trim();
      if (location) {
        unique.add(location);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [chapters]);

  const sdgOptions = useMemo(() => {
    const unique = new Set<string>();
    opportunities.forEach((opportunity) => {
      opportunity.sdgs.forEach((sdg) => {
        const value = sdg.trim();
        if (value) {
          unique.add(value);
        }
      });
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return opportunities.filter((item) => {
      const chapter = chapterMap.get(item.chapter_id);
      const chapterName = chapter?.name ?? '';
      const chapterLocation = chapter?.location?.trim() ?? '';

      const matchesChapter = chapterFilter === 'all' || item.chapter_id === chapterFilter;
      const matchesLocation =
        locationFilter === 'all' || chapterLocation.toLowerCase() === locationFilter.toLowerCase();
      const matchesSdg = sdgFilter === 'all' || item.sdgs.includes(sdgFilter);

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const eventDate = new Date(item.event_date);
        if (Number.isNaN(eventDate.getTime())) {
          matchesDate = false;
        } else if (dateFilter === 'upcoming') {
          matchesDate = eventDate >= now;
        } else {
          matchesDate = eventDate >= monthStart && eventDate < nextMonthStart;
        }
      }

      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        item.event_name.toLowerCase().includes(query) ||
        chapterName.toLowerCase().includes(query) ||
        chapterLocation.toLowerCase().includes(query) ||
        item.sdgs.some((sdg) => sdg.toLowerCase().includes(query));

      return matchesChapter && matchesLocation && matchesSdg && matchesDate && matchesSearch;
    });
  }, [chapterFilter, chapterMap, dateFilter, locationFilter, opportunities, sdgFilter, search]);

  const clearFilters = () => {
    setSearch('');
    setChapterFilter('all');
    setLocationFilter('all');
    setDateFilter('all');
    setSdgFilter('all');
  };

  return (
    <div className="content-container motion-enter flex flex-col gap-6">
      <header className="panel-surface p-5 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="eyebrow">Volunteer Opportunities</span>
        </div>

        <h1 className="section-title mt-3">Find Events You Can Join</h1>
        <p className="section-lead max-w-3xl">
          Discover service opportunities by chapter, schedule, and advocacy area. Sign up uses
          Google Form and status cards are synced from Supabase.
        </p>
      </header>

      <section className="panel-surface space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-orange-700">
            Volunteer Events
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            Public Search
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Chapter
            <select
              value={chapterFilter}
              onChange={(event) => setChapterFilter(event.target.value)}
              className="field-base"
            >
              <option value="all">All chapters</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Location
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="field-base"
            >
              <option value="all">All locations</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Schedule
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
              className="field-base"
            >
              <option value="all">All dates</option>
              <option value="upcoming">Upcoming only</option>
              <option value="this_month">This month</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            SDG
            <select
              value={sdgFilter}
              onChange={(event) => setSdgFilter(event.target.value)}
              className="field-base"
            >
              <option value="all">All SDGs</option>
              {sdgOptions.map((sdg) => (
                <option key={sdg} value={sdg}>
                  {sdg}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-1">
            Search
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Event, chapter, location"
              className="field-base"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <p className="text-sm font-medium text-slate-600">
            {loading
              ? 'Loading opportunities...'
              : `${filteredOpportunities.length} volunteer opportunit${
                  filteredOpportunities.length === 1 ? 'y' : 'ies'
                } found`}
          </p>

          <button type="button" onClick={clearFilters} className="btn-ghost">
            Clear filters
          </button>
        </div>

        {!isSignupSyncAvailable ? (
          <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
            Signup sync table is not available yet. Run `supabase/add-volunteer-signups.sql` in
            Supabase SQL Editor, then refresh.
          </p>
        ) : null}
      </section>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState label="Loading volunteer opportunities..." />
      ) : filteredOpportunities.length === 0 ? (
        <EmptyState
          title="No volunteer opportunities found"
          description="Try adjusting your filters or check back later."
        />
      ) : (
        <section>
          <div className="motion-stagger grid justify-items-start gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredOpportunities.map((opportunity) => {
              const chapter = chapterMap.get(opportunity.chapter_id);
              const chapterName = chapter?.name ?? 'Unknown chapter';
              const chapterLocation = chapter?.location?.trim() || 'Location to be announced';
              const eventDate = new Date(opportunity.event_date);
              const eventDateLabel = Number.isNaN(eventDate.getTime())
                ? opportunity.event_date
                : eventDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  });
              const eventTimeLabel =
                typeof opportunity.event_time === 'string' && opportunity.event_time.trim().length > 0
                  ? opportunity.event_time.trim()
                  : 'Time to be announced';

              const dynamicFilled = (opportunity as unknown as { volunteer_filled?: unknown })
                .volunteer_filled;
              const fallbackFilled =
                typeof dynamicFilled === 'number' && Number.isFinite(dynamicFilled) && dynamicFilled > 0
                  ? Math.floor(dynamicFilled)
                  : 0;
              const syncedFilled = signupCountByOpportunity.get(opportunity.id) ?? 0;
              const volunteersFilled = isSignupSyncAvailable ? syncedFilled : fallbackFilled;
              const isSignedUp = signedUpOpportunityIds.has(opportunity.id);

              const volunteerLimit = opportunity.volunteer_limit;
              const hasLimit = volunteerLimit != null && volunteerLimit > 0;
              const progressPercent = hasLimit
                ? Math.min(100, Math.round((volunteersFilled / volunteerLimit) * 100))
                : 0;
              const volunteersNeeded = hasLimit ? Math.max(volunteerLimit - volunteersFilled, 0) : 0;
              const signupUrl = buildVolunteerSignupUrl(
                opportunity.id,
                opportunity.event_name,
                session?.user.email
              );

              return (
                <article
                  key={opportunity.id}
                  className="w-full max-w-[22rem] overflow-hidden rounded-lg border border-slate-300 bg-slate-50 shadow-sm"
                >
                  <div className="aspect-[16/8] bg-slate-200 p-2">
                    <img
                      src={eventCardImage}
                      alt={opportunity.event_name}
                      className="h-full w-full rounded object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="space-y-2 p-3 sm:p-3.5">
                    <h3 className="line-clamp-2 text-lg font-extrabold leading-tight text-slate-800 sm:text-xl">
                      {opportunity.event_name}
                    </h3>

                    <div className="space-y-1.5 text-sm text-slate-700">
                      <div className="flex items-start gap-2">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor">
                          <path d="M21 3 3 10.53l6.84 2.63L12.47 20 21 3z" />
                        </svg>
                        <p className="line-clamp-2">{chapterLocation}</p>
                      </div>

                      <div className="flex items-start gap-2">
                        <svg
                          viewBox="0 0 24 24"
                          className="mt-0.5 h-4 w-4 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <p>{eventDateLabel}</p>
                      </div>

                      <div className="flex items-start gap-2">
                        <svg
                          viewBox="0 0 24 24"
                          className="mt-0.5 h-4 w-4 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v6l4 2" />
                        </svg>
                        <p>{eventTimeLabel}</p>
                      </div>

                      <div className="flex items-start gap-2">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor">
                          <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.67 0-8 1.34-8 4v2h10v-2a5.56 5.56 0 0 1 2.15-4.36A16.43 16.43 0 0 0 8 14zm8 0c-.29 0-.62 0-1 .05A4.48 4.48 0 0 1 18 18v2h6v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        <p className="font-semibold uppercase">{chapterName}</p>
                      </div>
                    </div>

                    {hasLimit ? (
                      <div>
                        <span className="inline-flex rounded bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                          {progressPercent}%
                        </span>
                        <div className="mt-1 h-3 overflow-hidden rounded bg-orange-100">
                          <div
                            className="h-full rounded bg-orange-500 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-orange-600">
                          {volunteersNeeded > 0
                            ? `${volunteersNeeded} more volunteers needed`
                            : 'Volunteer slots are full'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-slate-500">No volunteer limit set</p>
                    )}

                    <p className="text-xs font-semibold text-slate-600">
                      {volunteersFilled} volunteer{volunteersFilled === 1 ? '' : 's'} signed up
                    </p>

                    {isSignedUp ? (
                      <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        You already signed up
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary px-4 py-2 text-xs"
                      >
                        Sign Up
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
