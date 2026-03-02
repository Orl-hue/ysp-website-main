import { FormEvent, useCallback, useEffect, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { supabase } from '../../lib/supabaseClient';
import type { TableRow } from '../../types/database';

interface ChapterFormState {
  name: string;
  location: string;
  chapter_head_name: string;
  chapter_head_contact: string;
}

const defaultForm: ChapterFormState = {
  name: '',
  location: '',
  chapter_head_name: '',
  chapter_head_contact: '',
};

export const AdminChaptersPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [chapters, setChapters] = useState<TableRow<'chapters'>[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ChapterFormState>(defaultForm);

  const loadChapters = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('chapters')
      .select('*')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
    }

    setChapters((data as TableRow<'chapters'>[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadChapters();
  }, [loadChapters]);

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const name = form.name.trim();
    if (!name) {
      setError('Chapter name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name,
      location: form.location.trim() || null,
      chapter_head_name: form.chapter_head_name.trim() || null,
      chapter_head_contact: form.chapter_head_contact.trim() || null,
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from('chapters')
        .update(payload)
        .eq('id', editingId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setSuccess('Chapter updated successfully.');
    } else {
      const { error: insertError } = await supabase.from('chapters').insert(payload);

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setSuccess('Chapter created successfully.');
    }

    await loadChapters();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (chapter: TableRow<'chapters'>) => {
    setShowForm(true);
    setEditingId(chapter.id);
    setForm({
      name: chapter.name,
      location: chapter.location ?? '',
      chapter_head_name: chapter.chapter_head_name ?? '',
      chapter_head_contact: chapter.chapter_head_contact ?? '',
    });
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (chapter: TableRow<'chapters'>) => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const confirmed = window.confirm(
      `Delete chapter "${chapter.name}"? This also removes related volunteer opportunities.`
    );
    if (!confirmed) {
      return;
    }

    const { error: deleteError } = await supabase.from('chapters').delete().eq('id', chapter.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editingId === chapter.id) {
      resetForm();
    }

    setSuccess('Chapter deleted successfully.');
    await loadChapters();
  };

  return (
    <div className="motion-enter space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Chapters</h1>
        <p className="mt-2 text-sm text-slate-600">Manage chapter information and chapter head contacts.</p>
      </header>

      {error ? <ErrorState message={error} /> : null}
      {success ? (
        <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          {success}
        </p>
      ) : null}

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
          {showForm ? 'Hide Form' : 'Create Chapter'}
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
            Chapter Name *
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Location
            <input
              type="text"
              value={form.location}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, location: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Chapter Head Name
            <input
              type="text"
              value={form.chapter_head_name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, chapter_head_name: event.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Chapter Head Contact
            <input
              type="text"
              value={form.chapter_head_contact}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, chapter_head_contact: event.target.value }))
              }
              placeholder="Phone or email"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Update Chapter' : 'Create Chapter'}
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

      {loading ? (
        <LoadingState label="Loading chapters..." />
      ) : chapters.length === 0 ? (
        <EmptyState title="No chapters yet" description='Click "Create Chapter" to add your first entry.' />
      ) : (
        <div className="motion-stagger grid gap-3">
          {chapters.map((chapter) => (
            <article key={chapter.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{chapter.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {chapter.location || 'Location not set'}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Chapter Head: {chapter.chapter_head_name || 'Not set'}
                  </p>
                  <p className="text-sm text-slate-600">
                    Contact: {chapter.chapter_head_contact || 'Not set'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(chapter)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDelete(chapter);
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

