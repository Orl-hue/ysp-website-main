import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import type { TableRow, UserRole } from '../../types/database';

interface UserFormState {
  id: string;
  role: UserRole;
  chapter_id: string;
}

const defaultForm: UserFormState = {
  id: '',
  role: 'chapter_head',
  chapter_id: '',
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const AdminUsersPage = () => {
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<TableRow<'profiles'>[]>([]);
  const [chapters, setChapters] = useState<TableRow<'chapters'>[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [form, setForm] = useState<UserFormState>(defaultForm);

  const chapterMap = useMemo(() => {
    const map = new Map<string, string>();
    chapters.forEach((chapter) => {
      map.set(chapter.id, chapter.name);
    });
    return map;
  }, [chapters]);

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [profilesRes, chaptersRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('chapters').select('*').order('name', { ascending: true }),
    ]);

    const firstError = profilesRes.error ?? chaptersRes.error;
    if (firstError) {
      setError(firstError.message);
    }

    setProfiles((profilesRes.data as TableRow<'profiles'>[] | null) ?? []);
    setChapters((chaptersRes.data as TableRow<'chapters'>[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

    const userId = form.id.trim();
    const isChapterHead = form.role === 'chapter_head';
    const chapterId = form.chapter_id.trim();

    if (!editingId && !uuidPattern.test(userId)) {
      setError('User ID must be a valid UUID from auth.users.');
      return;
    }

    if (isChapterHead && !chapterId) {
      setError('Chapter Head accounts must have an assigned chapter.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      role: form.role,
      chapter_id: isChapterHead ? chapterId : null,
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', editingId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setSuccess('User profile updated successfully.');
    } else {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        ...payload,
      });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setSuccess('User profile created successfully.');
    }

    await loadData();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (profileRow: TableRow<'profiles'>) => {
    setShowForm(true);
    setEditingId(profileRow.id);
    setForm({
      id: profileRow.id,
      role: profileRow.role,
      chapter_id: profileRow.chapter_id ?? '',
    });
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (profileRow: TableRow<'profiles'>) => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    if (profileRow.id === session?.user.id) {
      setError('You cannot delete your own active admin profile.');
      return;
    }

    const confirmed = window.confirm(`Delete profile "${profileRow.id}"?`);
    if (!confirmed) {
      return;
    }

    const { error: deleteError } = await supabase.from('profiles').delete().eq('id', profileRow.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editingId === profileRow.id) {
      resetForm();
    }

    setSuccess('User profile deleted successfully.');
    await loadData();
  };

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return profiles.filter((profileRow) => {
      const matchesRole = roleFilter === 'all' || profileRow.role === roleFilter;
      if (!matchesRole) {
        return false;
      }

      if (!query) {
        return true;
      }

      const chapterName = profileRow.chapter_id
        ? (chapterMap.get(profileRow.chapter_id) ?? '').toLowerCase()
        : '';

      return (
        profileRow.id.toLowerCase().includes(query) ||
        profileRow.role.toLowerCase().includes(query) ||
        chapterName.includes(query)
      );
    });
  }, [chapterMap, profiles, roleFilter, search]);

  return (
    <div className="motion-enter space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">User Access</h1>
        <p className="mt-2 text-sm text-slate-600">
          Assign roles and chapter access for admin and chapter head accounts.
        </p>
      </header>

      {error ? <ErrorState message={error} /> : null}
      {success ? (
        <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          {success}
        </p>
      ) : null}

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by user id, role, chapter"
          className="field-base md:col-span-2"
        />
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}
          className="field-base"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="chapter_head">Chapter Head</option>
        </select>
      </section>

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
          {showForm ? 'Hide Form' : 'Add User Profile'}
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
            Auth User ID (UUID) *
            <input
              type="text"
              value={form.id}
              onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
              disabled={Boolean(editingId)}
              required
              placeholder="e.g. 2f6e9976-2f3f-4d43-b4ae-1bf1ab5d3a42"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Role *
            <select
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))
              }
              required
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="admin">Admin</option>
              <option value="chapter_head">Chapter Head</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Chapter {form.role === 'chapter_head' ? '*' : '(optional)'}
            <select
              value={form.chapter_id}
              onChange={(event) => setForm((prev) => ({ ...prev, chapter_id: event.target.value }))}
              required={form.role === 'chapter_head'}
              disabled={form.role !== 'chapter_head'}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
            >
              <option value="">Select a chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Update User Profile' : 'Create User Profile'}
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
        <LoadingState label="Loading user profiles..." />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState title="No user profiles found" description="Create one using the form above." />
      ) : (
        <div className="motion-stagger grid gap-3">
          {filteredProfiles.map((profileRow) => (
            <article key={profileRow.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">
                    {profileRow.role === 'admin' ? 'Admin' : 'Chapter Head'}
                  </h2>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">{profileRow.id}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Chapter:{' '}
                    {profileRow.chapter_id
                      ? (chapterMap.get(profileRow.chapter_id) ?? 'Unknown chapter')
                      : 'Not assigned'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Created: {new Date(profileRow.created_at).toLocaleString('en-US')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(profileRow)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDelete(profileRow);
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
