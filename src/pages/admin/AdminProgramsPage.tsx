import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { supabase } from '../../lib/supabaseClient';
import type { TableRow } from '../../types/database';
import { slugify } from '../../utils/slugify';

interface ProgramFormState {
  title: string;
  slug: string;
  description: string;
  image_url: string;
}

const defaultForm: ProgramFormState = {
  title: '',
  slug: '',
  description: '',
  image_url: '',
};

const isMissingSlugColumnError = (message: string): boolean =>
  message.toLowerCase().includes('column programs.slug does not exist');

const MAX_IMAGE_UPLOAD_BYTES = 3 * 1024 * 1024;

const readFileAsDataUrl = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Could not read image file.'));
    };

    reader.onerror = () => {
      reject(new Error('Could not read image file.'));
    };

    reader.readAsDataURL(file);
  });

export const AdminProgramsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [programs, setPrograms] = useState<TableRow<'programs'>[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSlugDirty, setIsSlugDirty] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProgramFormState>(defaultForm);

  const loadPrograms = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('programs')
      .select('*')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
    }

    setPrograms((data as TableRow<'programs'>[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPrograms();
  }, [loadPrograms]);

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
    setIsSlugDirty(false);
    setFileInputKey((prev) => prev + 1);
    setShowForm(false);
  };

  const handleTitleChange = (nextTitle: string) => {
    setForm((prev) => ({
      ...prev,
      title: nextTitle,
      slug: isSlugDirty ? prev.slug : slugify(nextTitle),
    }));
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WEBP, etc.).');
      setFileInputKey((prev) => prev + 1);
      return;
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError('Image is too large. Please choose an image under 3 MB.');
      setFileInputKey((prev) => prev + 1);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((prev) => ({ ...prev, image_url: dataUrl }));
      setSuccess(`Loaded image "${file.name}". Click save to apply.`);
    } catch {
      setError('Could not read the selected image file.');
    } finally {
      setFileInputKey((prev) => prev + 1);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const title = form.title.trim();
    const computedSlug = slugify(form.slug || form.title);
    const description = form.description.trim();
    const imageUrl = form.image_url.trim();

    if (!title || !computedSlug || !description) {
      setError('Title, slug, and description are required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      title,
      slug: computedSlug,
      description,
      image_url: imageUrl.length > 0 ? imageUrl : null,
    };
    const legacyPayload = {
      title,
      description,
      image_url: imageUrl.length > 0 ? imageUrl : null,
    };

    if (editingId) {
      const { error: updateError } = await supabase.from('programs').update(payload).eq('id', editingId);
      let resolvedUpdateError = updateError;

      if (resolvedUpdateError && isMissingSlugColumnError(resolvedUpdateError.message)) {
        const { error: retryUpdateError } = await supabase
          .from('programs')
          .update(legacyPayload)
          .eq('id', editingId);
        resolvedUpdateError = retryUpdateError;
      }

      if (resolvedUpdateError) {
        setError(resolvedUpdateError.message);
        setSaving(false);
        return;
      }

      setSuccess('Program updated successfully.');
    } else {
      const { error: insertError } = await supabase.from('programs').insert(payload);
      let resolvedInsertError = insertError;

      if (resolvedInsertError && isMissingSlugColumnError(resolvedInsertError.message)) {
        const { error: retryInsertError } = await supabase
          .from('programs')
          .insert(legacyPayload as never);
        resolvedInsertError = retryInsertError;
      }

      if (resolvedInsertError) {
        setError(resolvedInsertError.message);
        setSaving(false);
        return;
      }

      setSuccess('Program created successfully.');
    }

    await loadPrograms();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (program: TableRow<'programs'>) => {
    setShowForm(true);
    setEditingId(program.id);
    setForm({
      title: program.title,
      slug: program.slug || slugify(program.title),
      description: program.description,
      image_url: program.image_url ?? '',
    });
    setIsSlugDirty(true);
    setError(null);
    setSuccess(null);
    setFileInputKey((prev) => prev + 1);
  };

  const handleDelete = async (program: TableRow<'programs'>) => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const confirmed = window.confirm(`Delete program "${program.title}"?`);
    if (!confirmed) {
      return;
    }

    const { error: deleteError } = await supabase.from('programs').delete().eq('id', program.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editingId === program.id) {
      resetForm();
    }

    setSuccess('Program deleted successfully.');
    await loadPrograms();
  };

  return (
    <div className="motion-enter space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Programs</h1>
        <p className="mt-2 text-sm text-slate-600">Create, edit, and remove program entries.</p>
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
          {showForm ? 'Hide Form' : 'Create Program'}
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
            Title *
            <input
              type="text"
              value={form.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Slug *
            <input
              type="text"
              value={form.slug}
              onChange={(event) => {
                setIsSlugDirty(true);
                setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }));
              }}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Description *
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              required
              rows={5}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Image URL (optional)
            <input
              type="url"
              value={form.image_url}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, image_url: event.target.value }))
              }
              placeholder="https://example.com/program.jpg"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    void handleImageFileChange(event);
                  }}
                  className="sr-only"
                />
                Choose from device
              </label>

              {form.image_url ? (
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, image_url: '' }));
                    setFileInputKey((prev) => prev + 1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear image
                </button>
              ) : null}

              <span className="text-xs font-medium text-slate-500">Max size: 3 MB</span>
            </div>

            {form.image_url ? (
              <div className="mt-3 max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                <img
                  src={form.image_url}
                  alt="Program preview"
                  className="h-40 w-full rounded-lg object-cover"
                />
              </div>
            ) : null}
          </label>

          <div className="sm:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Update Program' : 'Create Program'}
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
        <LoadingState label="Loading programs..." />
      ) : programs.length === 0 ? (
        <EmptyState title="No programs yet" description='Click "Create Program" to add your first entry.' />
      ) : (
        <div className="motion-stagger grid gap-3">
          {programs.map((program) => (
            <article
              key={program.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{program.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">Slug: {program.slug || slugify(program.title)}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{program.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(program)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDelete(program);
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
