import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAuth } from '../../contexts/AuthContext';
import { retryWithTimeout, toErrorMessage } from '../../lib/request';
import { formatSupabaseErrorMessage } from '../../lib/supabaseErrors';
import { supabase } from '../../lib/supabaseClient';
import type { TableRow } from '../../types/database';

interface StatsFormState {
  projects_count: string;
  chapters_count: string;
  members_count: string;
}

const defaultForm: StatsFormState = {
  projects_count: '0',
  chapters_count: '0',
  members_count: '0',
};

type StatsKey = keyof StatsFormState;

interface MetricConfig {
  key: StatsKey;
  name: string;
  metricId: string;
  unit: string;
  group: string;
  code: string;
}

interface MetricStatus {
  type: 'pending' | 'on_process' | 'completed';
  label: string;
  badgeClassName: string;
  dotClassName: string;
  note: string;
  codeClassName: string;
}

interface MetricRow extends MetricConfig {
  value: number;
  status: MetricStatus;
}

interface CachedDashboardStats {
  rowId: string | null;
  projects_count: string;
  chapters_count: string;
  members_count: string;
}

const metricConfigs: MetricConfig[] = [
  {
    key: 'projects_count',
    name: 'Projects Implemented',
    metricId: '#YSP-PROJ',
    unit: 'projects',
    group: 'Programs',
    code: 'P1',
  },
  {
    key: 'chapters_count',
    name: 'Active Chapters',
    metricId: '#YSP-CHAP',
    unit: 'chapters',
    group: 'Network',
    code: 'C2',
  },
  {
    key: 'members_count',
    name: 'Registered Members',
    metricId: '#YSP-MEM',
    unit: 'members',
    group: 'Community',
    code: 'M3',
  },
];

const toNonNegativeInt = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

const getMetricStatus = (value: number): MetricStatus => {
  if (value <= 0) {
    return {
      type: 'pending',
      label: 'Needs Input',
      badgeClassName: 'border-orange-200 bg-orange-100 text-orange-800',
      dotClassName: 'bg-orange-500',
      note: 'Set an initial value',
      codeClassName: 'bg-orange-500 text-white',
    };
  }

  if (value < 25) {
    return {
      type: 'on_process',
      label: 'In Progress',
      badgeClassName: 'border-orange-200 bg-orange-100 text-orange-800',
      dotClassName: 'bg-orange-500',
      note: 'Growing steadily',
      codeClassName: 'bg-orange-600 text-white',
    };
  }

  return {
    type: 'completed',
    label: 'Healthy',
    badgeClassName: 'border-orange-300 bg-orange-100 text-orange-900',
    dotClassName: 'bg-orange-600',
    note: 'Strong metric level',
    codeClassName: 'bg-orange-700 text-white',
  };
};

const DASHBOARD_CACHE_KEY = 'ysp.admin.dashboard_stats_cache';
const DASHBOARD_TIMEOUT_MS = 15000;
const DASHBOARD_HARD_STOP_MS = 25000;
const DASHBOARD_RETRY_ATTEMPTS = 3;

const isTimeoutLikeMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('timed out') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('network')
  );
};

const readCachedDashboardStats = (): CachedDashboardStats | null => {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CachedDashboardStats> | null;
    if (!parsed) {
      return null;
    }

    if (
      typeof parsed.projects_count !== 'string' ||
      typeof parsed.chapters_count !== 'string' ||
      typeof parsed.members_count !== 'string'
    ) {
      return null;
    }

    return {
      rowId: typeof parsed.rowId === 'string' ? parsed.rowId : null,
      projects_count: parsed.projects_count,
      chapters_count: parsed.chapters_count,
      members_count: parsed.members_count,
    };
  } catch {
    return null;
  }
};

const saveCachedDashboardStats = (value: CachedDashboardStats): void => {
  try {
    window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(value));
  } catch {
    // Best-effort cache only.
  }
};

export const AdminDashboardPage = () => {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);
  const [form, setForm] = useState<StatsFormState>(defaultForm);
  const [initialForm, setInitialForm] = useState<StatsFormState>(defaultForm);

  const canEdit = profile?.role === 'admin';

  const applyFormState = (nextForm: StatsFormState, nextRowId: string | null) => {
    setRowId(nextRowId);
    setForm(nextForm);
    setInitialForm(nextForm);
    saveCachedDashboardStats({
      rowId: nextRowId,
      ...nextForm,
    });
  };

  const applyCachedState = (): boolean => {
    const cached = readCachedDashboardStats();
    if (!cached) {
      return false;
    }

    const nextForm = {
      projects_count: cached.projects_count,
      chapters_count: cached.chapters_count,
      members_count: cached.members_count,
    };
    setRowId(cached.rowId);
    setForm(nextForm);
    setInitialForm(nextForm);
    return true;
  };

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
      setError(null);

      hardStopTimer = setTimeout(() => {
        if (isMounted) {
          setLoading(false);
          setError((current) =>
            current ??
            'Dashboard is taking too long to load. Check internet/Supabase, then refresh.'
          );
        }
      }, DASHBOARD_HARD_STOP_MS);

      try {
        const { data, error: queryError } = await retryWithTimeout(
          () =>
            client
              .from('site_stats')
              .select('*')
              .order('updated_at', { ascending: false })
              .limit(1),
          {
            attempts: DASHBOARD_RETRY_ATTEMPTS,
            timeoutMs: DASHBOARD_TIMEOUT_MS,
            timeoutMessage: 'Request timed out while loading dashboard stats.',
          }
        );

        if (!isMounted) {
          return;
        }

        if (queryError) {
          setError(formatSupabaseErrorMessage(queryError.message));
        }

        const row = (data?.[0] as TableRow<'site_stats'> | undefined) ?? null;
        if (row) {
          const nextForm = {
            projects_count: String(row.projects_count),
            chapters_count: String(row.chapters_count),
            members_count: String(row.members_count),
          };

          applyFormState(nextForm, row.id);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        const message = toErrorMessage(loadError);
        if (isTimeoutLikeMessage(message)) {
          const hasCached = applyCachedState();
          setError(
            hasCached
              ? 'Live dashboard stats timed out. Showing last saved values.'
              : 'Dashboard stats timed out. Check internet/Supabase, then refresh.'
          );
        } else {
          setError(formatSupabaseErrorMessage(message));
        }
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

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      projects_count: toNonNegativeInt(form.projects_count),
      chapters_count: toNonNegativeInt(form.chapters_count),
      members_count: toNonNegativeInt(form.members_count),
    };

    if (rowId) {
      const { data, error: updateError } = await supabase
        .from('site_stats')
        .update(payload)
        .eq('id', rowId)
        .select('*')
        .maybeSingle();

      if (updateError) {
        setError(formatSupabaseErrorMessage(updateError.message));
        setSaving(false);
        return;
      }

      const updatedRow = (data as TableRow<'site_stats'> | null) ?? null;
      if (updatedRow) {
        const nextForm = {
          projects_count: String(updatedRow.projects_count),
          chapters_count: String(updatedRow.chapters_count),
          members_count: String(updatedRow.members_count),
        };

        applyFormState(nextForm, updatedRow.id);
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('site_stats')
        .insert(payload)
        .select('*')
        .maybeSingle();

      if (insertError) {
        setError(formatSupabaseErrorMessage(insertError.message));
        setSaving(false);
        return;
      }

      const insertedRow = (data as TableRow<'site_stats'> | null) ?? null;
      if (insertedRow) {
        const nextForm = {
          projects_count: String(insertedRow.projects_count),
          chapters_count: String(insertedRow.chapters_count),
          members_count: String(insertedRow.members_count),
        };

        applyFormState(nextForm, insertedRow.id);
      }
    }

    setSuccess('Site statistics updated successfully.');
    setSaving(false);
  };

  const hasChanges = canEdit
    ? (Object.keys(defaultForm) as StatsKey[]).some((key) => form[key] !== initialForm[key])
    : false;

  const metricRows = useMemo<MetricRow[]>(() => {
    return metricConfigs.map((config) => {
      const value = toNonNegativeInt(form[config.key]);
      const status = getMetricStatus(value);
      return {
        ...config,
        value,
        status,
      };
    });
  }, [form]);

  if (loading) {
    return <LoadingState label="Loading site stats..." />;
  }

  return (
    <form onSubmit={handleSave} className="motion-enter flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-bold leading-tight text-slate-900 sm:text-[2.15rem]">
          YSP Statistics
        </h1>
        {canEdit ? (
          <button
            type="submit"
            disabled={saving || !hasChanges}
            className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Counters'}
          </button>
        ) : null}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {success ? (
        <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          {success}
        </p>
      ) : null}

      {!canEdit ? (
        <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
          Chapter Head accounts can view stats only. Admin accounts can edit counters.
        </p>
      ) : null}

      <div className="motion-stagger grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-3">
        {metricRows.map((row) => (
          <article key={row.key} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <h2 className="text-lg font-bold leading-tight text-slate-900">{row.name}</h2>
                <p className="text-xs font-medium text-slate-500">{row.metricId} / {row.group}</p>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${row.status.badgeClassName}`}
                >
                  {row.status.label}
                </span>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${row.status.dotClassName}`} />
                  {row.status.note}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Value</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit</p>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                {canEdit ? (
                  <input
                    type="number"
                    min={0}
                    value={form[row.key]}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, [row.key]: event.target.value }))
                    }
                    className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-lg font-extrabold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                ) : (
                  <p className="text-2xl font-black text-slate-900">{row.value}</p>
                )}

                <p className="text-sm font-semibold text-slate-600">{row.unit}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </form>
  );
};
