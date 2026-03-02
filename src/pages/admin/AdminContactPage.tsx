import { FormEvent, useEffect, useState } from 'react';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { supabase } from '../../lib/supabaseClient';
import type { TableRow } from '../../types/database';

interface ContactFormState {
  email: string;
  facebook_url: string;
  mobile: string;
  location: string;
}

const defaultForm: ContactFormState = {
  email: '',
  facebook_url: '',
  mobile: '',
  location: '',
};

export const AdminContactPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ContactFormState>(defaultForm);
  const [initialForm, setInitialForm] = useState<ContactFormState>(defaultForm);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('contact_details')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (queryError) {
        setError(queryError.message);
      }

      const row = (data?.[0] as TableRow<'contact_details'> | undefined) ?? null;
      if (row) {
        setRowId(row.id);
        const nextForm = {
          email: row.email,
          facebook_url: row.facebook_url,
          mobile: row.mobile,
          location: row.location || '',
        };
        setForm(nextForm);
        setInitialForm(nextForm);
      }

      setLoading(false);
    };

    void load();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setShowForm(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const email = form.email.trim();
    const facebookUrl = form.facebook_url.trim();
    const mobile = form.mobile.trim();
    const location = form.location.trim();

    if (!email || !facebookUrl || !mobile || !location) {
      setError('Email, Facebook URL, mobile, and location are required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      email,
      facebook_url: facebookUrl,
      mobile,
      location,
    };

    if (rowId) {
      const { data, error: updateError } = await supabase
        .from('contact_details')
        .update(payload)
        .eq('id', rowId)
        .select('*')
        .maybeSingle();

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      const updatedRow = (data as TableRow<'contact_details'> | null) ?? null;
      if (updatedRow) {
        const nextForm = {
          email: updatedRow.email,
          facebook_url: updatedRow.facebook_url,
          mobile: updatedRow.mobile,
          location: updatedRow.location || '',
        };
        setForm(nextForm);
        setInitialForm(nextForm);
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('contact_details')
        .insert(payload)
        .select('*')
        .maybeSingle();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      const insertedRow = (data as TableRow<'contact_details'> | null) ?? null;
      if (insertedRow) {
        setRowId(insertedRow.id);
        const nextForm = {
          email: insertedRow.email,
          facebook_url: insertedRow.facebook_url,
          mobile: insertedRow.mobile,
          location: insertedRow.location || '',
        };
        setForm(nextForm);
        setInitialForm(nextForm);
      }
    }

    setSuccess('Contact details updated successfully.');
    setSaving(false);
  };

  if (loading) {
    return <LoadingState label="Loading contact details..." />;
  }

  return (
    <div className="motion-enter space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Contact Details</h1>
        <p className="mt-2 text-sm text-slate-600">
          Update the public contact information shown on the Contact page.
        </p>
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
          {showForm ? 'Hide Form' : rowId ? 'Edit Contact Details' : 'Create Contact Details'}
        </button>

        {showForm && !rowId ? (
          <button
            type="button"
            onClick={() => setForm(defaultForm)}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Clear
          </button>
        ) : null}
      </div>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-4"
        >
          <label className="text-sm font-semibold text-slate-700">
            Email *
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Facebook URL *
            <input
              type="url"
              value={form.facebook_url}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, facebook_url: event.target.value }))
              }
              required
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Mobile *
            <input
              type="text"
              value={form.mobile}
              onChange={(event) => setForm((prev) => ({ ...prev, mobile: event.target.value }))}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Location *
            <input
              type="text"
              value={form.location}
              onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
              required
              placeholder="Philippines Nationwide"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Contact Details'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
};
