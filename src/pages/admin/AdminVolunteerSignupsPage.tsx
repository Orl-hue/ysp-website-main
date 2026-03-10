import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { formatSupabaseErrorMessage } from '../../lib/supabaseErrors';
import { supabase } from '../../lib/supabaseClient';
import type { TableRow } from '../../types/database';

export const AdminVolunteerSignupsPage = () => {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [signups, setSignups] = useState<TableRow<'volunteer_signups'>[]>([]);
  const [opportunities, setOpportunities] = useState<TableRow<'volunteer_opportunities'>[]>([]);
  const [chapters, setChapters] = useState<TableRow<'chapters'>[]>([]);

  const isAdmin = profile?.role === 'admin';
  const chapterHeadNeedsAssignment = profile?.role === 'chapter_head' && !profile.chapter_id;

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    if (!profile) {
      setLoading(false);
      return;
    }

    if (chapterHeadNeedsAssignment) {
      setError(
        'Your chapter head account is not assigned to any chapter yet. Ask an admin to set profiles.chapter_id for your user.'
      );
      setSignups([]);
      setOpportunities([]);
      setChapters([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    let opportunitiesQuery = supabase
      .from('volunteer_opportunities')
      .select('*')
      .order('event_date', { ascending: true });
    let chaptersQuery = supabase.from('chapters').select('*').order('name', { ascending: true });

    if (profile.role === 'chapter_head') {
      opportunitiesQuery = opportunitiesQuery.eq('chapter_id', profile.chapter_id ?? '');
      chaptersQuery = chaptersQuery.eq('id', profile.chapter_id ?? '');
    }

    const [opportunitiesRes, chaptersRes] = await Promise.all([
      opportunitiesQuery,
      chaptersQuery,
    ]);

    const firstError = opportunitiesRes.error ?? chaptersRes.error;
    if (firstError) {
      setError(formatSupabaseErrorMessage(firstError.message));
      setSignups([]);
      setOpportunities([]);
      setChapters([]);
      setLoading(false);
      return;
    }

    const nextOpportunities =
      (opportunitiesRes.data as TableRow<'volunteer_opportunities'>[] | null) ?? [];
    const nextChapters = (chaptersRes.data as TableRow<'chapters'>[] | null) ?? [];

    setOpportunities(nextOpportunities);
    setChapters(nextChapters);

    const opportunityIds = nextOpportunities.map((opportunity) => opportunity.id);
    if (opportunityIds.length === 0) {
      setSignups([]);
      setLoading(false);
      return;
    }

    const signupsQuery = supabase
      .from('volunteer_signups')
      .select('*')
      .in('opportunity_id', opportunityIds)
      .order('signed_at', { ascending: false });

    const { data: signupsData, error: signupsError } = await signupsQuery;
    if (signupsError) {
      setError(formatSupabaseErrorMessage(signupsError.message));
      setSignups([]);
      setLoading(false);
      return;
    }

    setSignups((signupsData as TableRow<'volunteer_signups'>[] | null) ?? []);
    setLoading(false);
  }, [chapterHeadNeedsAssignment, profile]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const opportunityMap = useMemo(() => {
    const map = new Map<string, TableRow<'volunteer_opportunities'>>();
    opportunities.forEach((opportunity) => map.set(opportunity.id, opportunity));
    return map;
  }, [opportunities]);

  const chapterMap = useMemo(() => {
    const map = new Map<string, string>();
    chapters.forEach((chapter) => map.set(chapter.id, chapter.name));
    return map;
  }, [chapters]);

  const filteredSignups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return signups;
    }

    return signups.filter((signup) => {
      const opportunity = opportunityMap.get(signup.opportunity_id);
      const eventName = opportunity?.event_name.toLowerCase() ?? '';
      const chapterName = opportunity?.chapter_id
        ? (chapterMap.get(opportunity.chapter_id) ?? '').toLowerCase()
        : '';
      const email = signup.email.toLowerCase();
      const fullName = (signup.full_name ?? '').toLowerCase();
      const source = signup.source.toLowerCase();

      return (
        email.includes(query) ||
        fullName.includes(query) ||
        source.includes(query) ||
        eventName.includes(query) ||
        chapterName.includes(query)
      );
    });
  }, [chapterMap, opportunityMap, search, signups]);

  const totalOpportunitiesWithSignups = useMemo(() => {
    return new Set(signups.map((signup) => signup.opportunity_id)).size;
  }, [signups]);

  const handleDeleteSignup = async (signupRow: TableRow<'volunteer_signups'>) => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    if (!isAdmin) {
      return;
    }

    const confirmed = window.confirm(`Delete signup for "${signupRow.email}"?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(signupRow.id);
    setError(null);
    setSuccess(null);

    const { error: deleteError } = await supabase
      .from('volunteer_signups')
      .delete()
      .eq('id', signupRow.id);

    if (deleteError) {
      setError(formatSupabaseErrorMessage(deleteError.message));
      setDeletingId(null);
      return;
    }

    setSuccess('Signup deleted successfully.');
    setDeletingId(null);
    await loadData();
  };

  if (loading) {
    return <LoadingState label="Loading volunteer signups..." />;
  }

  return (
    <div className="motion-enter space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Volunteer Signups</h1>
        <p className="mt-2 text-sm text-slate-600">
          {isAdmin
            ? 'Review volunteer signup submissions across all chapters.'
            : 'Review volunteer signup submissions for your chapter.'}
        </p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Total Signups</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{signups.length}</p>
        </article>
        <article className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Events With Signups</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{totalOpportunitiesWithSignups}</p>
        </article>
        <article className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Role Scope</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{isAdmin ? 'All' : 'Chapter'}</p>
        </article>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {success ? (
        <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          {success}
        </p>
      ) : null}

      {!isAdmin ? (
        <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          Chapter Head accounts are view-only for signup records.
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-sm font-semibold text-slate-700">
          Search
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Email, name, source, event, chapter"
            className="field-base mt-1"
          />
        </label>
      </section>

      {filteredSignups.length === 0 ? (
        <EmptyState title="No signup records found" description="Synced records will appear here." />
      ) : (
        <div className="motion-stagger grid gap-3">
          {filteredSignups.map((signup) => {
            const opportunity = opportunityMap.get(signup.opportunity_id);
            const chapterName = opportunity?.chapter_id
              ? (chapterMap.get(opportunity.chapter_id) ?? 'Unknown chapter')
              : 'Unknown chapter';

            return (
              <article key={signup.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {opportunity?.event_name ?? 'Unknown opportunity'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {chapterName} • {opportunity?.event_date ?? 'No date'}
                      {opportunity?.event_time ? ` • ${opportunity.event_time}` : ''}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Email: <span className="font-medium">{signup.email}</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      Name: <span className="font-medium">{signup.full_name || 'Not provided'}</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      Source: <span className="font-medium">{signup.source}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Signed: {new Date(signup.signed_at).toLocaleString('en-US')}
                    </p>
                  </div>

                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleDeleteSignup(signup);
                      }}
                      disabled={deletingId === signup.id}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === signup.id ? 'Deleting...' : 'Delete'}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
