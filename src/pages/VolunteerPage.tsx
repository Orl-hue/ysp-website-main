import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { retryWithTimeout, toErrorMessage } from '../lib/request';
import { formatSupabaseErrorMessage } from '../lib/supabaseErrors';
import { supabase } from '../lib/supabaseClient';
import type { TableRow } from '../types/database';
import eventCardImage from '../assets/ysp-image-optimized.jpg';

type DateFilter = 'all' | 'upcoming' | 'this_month';
const memberFormUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLSdwMKgIjQNrlLH-j-Qdx0MrKxefxaLRC6gMI_oOgMTosDi_sQ/viewform';

export const VolunteerPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<TableRow<'volunteer_opportunities'>[]>([]);
  const [chapters, setChapters] = useState<TableRow<'chapters'>[]>([]);

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
        const [opportunitiesRes, chaptersRes] = await retryWithTimeout(
          () =>
            Promise.all([
              client
                .from('volunteer_opportunities')
                .select('*')
                .order('event_date', { ascending: true }),
              client.from('chapters').select('*').order('name', { ascending: true }),
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
          Discover service opportunities by chapter, schedule, and advocacy area. To sign up, contact the chapter head listed on each event card.
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
              const dynamicEventTime = (opportunity as unknown as { event_time?: unknown })
                .event_time;
              const eventTimeLabel =
                typeof dynamicEventTime === 'string' && dynamicEventTime.trim().length > 0
                  ? dynamicEventTime.trim()
                  : 'Time to be announced';

              const dynamicFilled = (opportunity as unknown as { volunteer_filled?: unknown })
                .volunteer_filled;
              const volunteersFilled =
                typeof dynamicFilled === 'number' && Number.isFinite(dynamicFilled) && dynamicFilled > 0
                  ? Math.floor(dynamicFilled)
                  : 0;
              const volunteerLimit = opportunity.volunteer_limit;
              const hasLimit = volunteerLimit != null && volunteerLimit > 0;
              const progressPercent = hasLimit
                ? Math.min(100, Math.round((volunteersFilled / volunteerLimit) * 100))
                : 0;
              const volunteersNeeded = hasLimit ? Math.max(volunteerLimit - volunteersFilled, 0) : 0;

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
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <p>{eventDateLabel}</p>
                      </div>

                      <div className="flex items-start gap-2">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
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
                      <p className="text-sm font-medium text-slate-500">
                        No volunteer limit set
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={memberFormUrl}
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
