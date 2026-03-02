import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { supabase } from '../lib/supabaseClient';
import type { TableRow } from '../types/database';
import { slugify } from '../utils/slugify';

export const ProgramDetailPage = () => {
  const { slug: pathKey } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [program, setProgram] = useState<TableRow<'programs'> | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!pathKey) {
        setError('Program identifier is missing.');
        setLoading(false);
        return;
      }

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
        setProgram(null);
        setLoading(false);
        return;
      }

      const programs = (data as TableRow<'programs'>[] | null) ?? [];
      const normalizedPathKey = pathKey.toLowerCase();
      const matchedProgram =
        programs.find((item) => item.id === pathKey) ??
        programs.find((item) => (item.slug ?? '').toLowerCase() === normalizedPathKey) ??
        programs.find((item) => slugify(item.title) === normalizedPathKey) ??
        null;

      setProgram(matchedProgram);
      setLoading(false);
    };

    void load();
  }, [pathKey]);

  return (
    <div className="content-container space-y-5">
      <Link to="/programs" className="btn-ghost">
        Back to programs
      </Link>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState label="Loading program details..." />
      ) : !program ? (
        <EmptyState title="Program not found" description="The selected program does not exist." />
      ) : (
        <article className="panel-surface overflow-hidden">
          <div className="relative h-72 w-full bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 sm:h-96">
            {program.image_url ? (
              <img src={program.image_url} alt={program.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-orange-700">
                Program image not available.
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <span className="eyebrow">Program Spotlight</span>
              <h1 className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">{program.title}</h1>
            </div>
          </div>

          <div className="space-y-4 p-6 sm:p-9">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 sm:text-base">
              {program.description}
            </p>
          </div>
        </article>
      )}
    </div>
  );
};
