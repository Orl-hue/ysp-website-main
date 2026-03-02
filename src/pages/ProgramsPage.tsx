import { useEffect, useState } from 'react';
import { ProgramCard } from '../components/ProgramCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { supabase } from '../lib/supabaseClient';
import type { TableRow } from '../types/database';

export const ProgramsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<TableRow<'programs'>[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) {
        setError(queryError.message);
      }

      setPrograms((data as TableRow<'programs'>[] | null) ?? []);
      setLoading(false);
    };

    void load();
  }, []);

  return (
    <div className="content-container motion-enter space-y-6">
      <header className="panel-surface relative overflow-hidden p-6 sm:p-8 lg:p-10">
        <div
          className="pointer-events-none absolute -right-10 top-2 h-36 w-36 rounded-full bg-orange-200/40 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <span className="eyebrow">Programs Directory</span>
          <h1 className="section-title mt-3">Programs</h1>
          <p className="section-lead max-w-3xl">
            Discover current and past Youth Service Philippines programs happening across
            partner campuses, communities, and chapter networks.
          </p>
          <p className="mt-4 text-sm font-semibold text-orange-700">
            {loading ? 'Loading list...' : `${programs.length} program${programs.length === 1 ? '' : 's'} available`}
          </p>
        </div>
      </header>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState label="Loading programs..." />
      ) : programs.length === 0 ? (
        <EmptyState title="No programs available" description="Please check back soon." />
      ) : (
        <div className="motion-stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </div>
  );
};
