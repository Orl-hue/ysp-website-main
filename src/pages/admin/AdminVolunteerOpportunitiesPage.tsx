import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { formatSupabaseErrorMessage } from '../../lib/supabaseErrors';
import { supabase } from '../../lib/supabaseClient';
import type { TableRow } from '../../types/database';
import { formatDate } from '../../utils/format';

interface OpportunityFormState {
  event_name: string;
  event_date: string;
  chapter_id: string;
  sdgs_text: string;
  chapter_head_contact: string;
  volunteer_limit: string;
}

const defaultForm: OpportunityFormState = {
  event_name: '',
  event_date: '',
  chapter_id: '',
  sdgs_text: '',
  chapter_head_contact: '',
  volunteer_limit: '',
};

const parseSdgs = (value: string): string[] => {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part, index, arr) => part.length > 0 && arr.indexOf(part) === index);
};

const isVolunteerLimitColumnMissing = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('volunteer_limit') &&
    (normalized.includes('column') ||
      normalized.includes('schema cache') ||
      normalized.includes('does not exist') ||
      normalized.includes('not found'))
  );
};

export const AdminVolunteerOpportunitiesPage = () => {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<TableRow<'volunteer_opportunities'>[]>([]);
  const [chapters, setChapters] = useState<TableRow<'chapters'>[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OpportunityFormState>(defaultForm);

  const isAdmin = profile?.role === 'admin';
  const chapterIdForHead = profile?.chapter_id ?? '';
  const chapterHeadNeedsAssignment = profile?.role === 'chapter_head' && !profile.chapter_id;

  const chapterMap = useMemo(() => {
    const map = new Map<string, string>();
    chapters.forEach((chapter) => map.set(chapter.id, chapter.name));
    return map;
  }, [chapters]);

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
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

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
    }

    setOpportunities(
      (opportunitiesRes.data as TableRow<'volunteer_opportunities'>[] | null) ?? []
    );
    setChapters((chaptersRes.data as TableRow<'chapters'>[] | null) ?? []);

    if (profile.role === 'chapter_head' && profile.chapter_id) {
      setForm((prev) => ({ ...prev, chapter_id: profile.chapter_id ?? prev.chapter_id }));
    }

    setLoading(false);
  }, [chapterHeadNeedsAssignment, profile]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...defaultForm,
      chapter_id: isAdmin ? '' : chapterIdForHead,
    });
    setShowForm(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const eventName = form.event_name.trim();
    const eventDate = form.event_date;
    const chapterId = isAdmin ? form.chapter_id : chapterIdForHead;
    const chapterHeadContact = form.chapter_head_contact.trim();
    const sdgs = parseSdgs(form.sdgs_text);
    const limitText = form.volunteer_limit.trim();
    const volunteerLimit = limitText === '' ? null : Number(limitText);

    if (!eventName || !eventDate || !chapterId || !chapterHeadContact) {
      setError('Event name, date, chapter, and chapter head contact are required.');
      return;
    }

    if (
      limitText !== '' &&
      (!Number.isInteger(volunteerLimit) || (volunteerLimit ?? 0) <= 0)
    ) {
      setError('Volunteer limit must be a whole number greater than 0.');
      return;
    }

    if (!isAdmin && chapterId !== chapterIdForHead) {
      setError('Chapter Head accounts can only manage opportunities for their own chapter.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const basePayload = {
      event_name: eventName,
      event_date: eventDate,
      chapter_id: chapterId,
      sdgs,
      chapter_head_contact: chapterHeadContact,
    };

    const payloadWithLimit = {
      ...basePayload,
      volunteer_limit: volunteerLimit,
    };

    if (editingId) {
      let { error: updateError } = await supabase
        .from('volunteer_opportunities')
        .update(payloadWithLimit)
        .eq('id', editingId);

      let skippedVolunteerLimit = false;
      if (updateError && isVolunteerLimitColumnMissing(updateError.message)) {
        const { error: retryError } = await supabase
          .from('volunteer_opportunities')
          .update(basePayload)
          .eq('id', editingId);
        updateError = retryError;
        skippedVolunteerLimit = !retryError;
      }

      if (updateError) {
        setError(formatSupabaseErrorMessage(updateError.message));
        setSaving(false);
        return;
      }

      setSuccess(
        skippedVolunteerLimit
          ? 'Volunteer opportunity updated. Volunteer limit was skipped because Supabase schema is outdated.'
          : 'Volunteer opportunity updated successfully.'
      );
    } else {
      let { error: insertError } = await supabase
        .from('volunteer_opportunities')
        .insert(payloadWithLimit);

      let skippedVolunteerLimit = false;
      if (insertError && isVolunteerLimitColumnMissing(insertError.message)) {
        const { error: retryError } = await supabase
          .from('volunteer_opportunities')
          .insert(basePayload);
        insertError = retryError;
        skippedVolunteerLimit = !retryError;
      }

      if (insertError) {
        setError(formatSupabaseErrorMessage(insertError.message));
        setSaving(false);
        return;
      }

      setSuccess(
        skippedVolunteerLimit
          ? 'Volunteer opportunity created. Volunteer limit was skipped because Supabase schema is outdated.'
          : 'Volunteer opportunity created successfully.'
      );
    }

    await loadData();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (opportunity: TableRow<'volunteer_opportunities'>) => {
    setShowForm(true);
    setEditingId(opportunity.id);
    setForm({
      event_name: opportunity.event_name,
      event_date: opportunity.event_date,
      chapter_id: opportunity.chapter_id,
      sdgs_text: opportunity.sdgs.join(', '),
      chapter_head_contact: opportunity.chapter_head_contact,
      volunteer_limit:
        opportunity.volunteer_limit == null ? '' : String(opportunity.volunteer_limit),
    });
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (opportunity: TableRow<'volunteer_opportunities'>) => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const confirmed = window.confirm(`Delete opportunity "${opportunity.event_name}"?`);
    if (!confirmed) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('volunteer_opportunities')
      .delete()
      .eq('id', opportunity.id);

    if (deleteError) {
      setError(formatSupabaseErrorMessage(deleteError.message));
      return;
    }

    if (editingId === opportunity.id) {
      resetForm();
    }

    setSuccess('Volunteer opportunity deleted successfully.');
    await loadData();
  };

  return (
    <div className="motion-enter space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Volunteer Opportunities</h1>
        <p className="mt-2 text-sm text-slate-600">
          {isAdmin
            ? 'Manage volunteer opportunities across all chapters.'
            : 'Manage volunteer opportunities for your assigned chapter.'}
        </p>
      </header>

      {error ? <ErrorState message={error} /> : null}
      {success ? (
        <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          {success}
        </p>
      ) : null}

      {chapterHeadNeedsAssignment ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          Ask an admin to assign your chapter first. After assignment, refresh this page and you can create volunteer opportunities.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccess(null);
                setShowForm((prev) => {
                  if (prev) {
                    resetForm();
                    return false;
                  }
                  return true;
                });
              }}
              className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              {showForm ? 'Hide Form' : 'Create Opportunity'}
            </button>

            {showForm && !editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Clear
              </button>
            ) : null}
          </div>

          {showForm ? (
            <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Event Name *
                <input
                  type="text"
                  value={form.event_name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, event_name: event.target.value }))
                  }
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Event Date *
                <input
                  type="date"
                  value={form.event_date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, event_date: event.target.value }))
                  }
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              {isAdmin ? (
                <label className="text-sm font-semibold text-slate-700">
                  Chapter *
                  <select
                    value={form.chapter_id}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, chapter_id: event.target.value }))
                    }
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="">Select a chapter</option>
                    {chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="text-sm font-semibold text-slate-700">
                  Chapter
                  <input
                    type="text"
                    value={chapterMap.get(chapterIdForHead) ?? 'Assigned chapter'}
                    disabled
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm"
                  />
                </label>
              )}

              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                SDGs (comma-separated)
                <input
                  type="text"
                  value={form.sdgs_text}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, sdgs_text: event.target.value }))
                  }
                  placeholder="SDG 1, SDG 4, SDG 13"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Chapter Head Contact *
                <input
                  type="text"
                  value={form.chapter_head_contact}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, chapter_head_contact: event.target.value }))
                  }
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Volunteer Limit
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.volunteer_limit}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, volunteer_limit: event.target.value }))
                  }
                  placeholder="Optional (e.g. 50)"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <div className="sm:col-span-2 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Update Opportunity'
                      : 'Create Opportunity'}
                </button>

                {editingId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}
        </>
      )}

      {loading ? (
        <LoadingState label="Loading volunteer opportunities..." />
      ) : opportunities.length === 0 ? (
        <EmptyState
          title="No volunteer opportunities yet"
          description='Click "Create Opportunity" to add your first entry.'
        />
      ) : (
        <div className="motion-stagger grid gap-3">
          {opportunities.map((opportunity) => (
            <article key={opportunity.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {opportunity.event_name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDate(opportunity.event_date)} •{' '}
                    {chapterMap.get(opportunity.chapter_id) ?? 'Unknown chapter'}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    SDGs: {opportunity.sdgs.length > 0 ? opportunity.sdgs.join(', ') : 'Not set'}
                  </p>
                  <p className="text-sm text-slate-600">
                    Contact: {opportunity.chapter_head_contact}
                  </p>
                  <p className="text-sm text-slate-600">
                    Volunteer limit:{' '}
                    {opportunity.volunteer_limit == null
                      ? 'No limit set'
                      : opportunity.volunteer_limit}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(opportunity)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDelete(opportunity);
                    }}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

