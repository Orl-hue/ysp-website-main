import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChaptersGrid } from '../components/ChaptersGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { supabase } from '../lib/supabaseClient';
import type { TableRow } from '../types/database';
import { withEmbeddedTrue } from '../utils/format';

const memberFormUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLSdwMKgIjQNrlLH-j-Qdx0MrKxefxaLRC6gMI_oOgMTosDi_sQ/viewform';
const chapterFormUrl = 'https://forms.gle/cWPsgBJKLaQoLuUr8';

type MembershipTab = 'member' | 'chapter';

export const MembershipPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<TableRow<'chapters'>[]>([]);

  const tabParam = searchParams.get('tab');
  const activeTab: MembershipTab = tabParam === 'chapter' ? 'chapter' : 'member';

  const memberEmbedUrl = useMemo(() => withEmbeddedTrue(memberFormUrl), []);
  const chapterEmbedUrl = useMemo(() => withEmbeddedTrue(chapterFormUrl), []);

  const handleTabChange = (tab: MembershipTab) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const loadChapters = async () => {
      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('chapters')
        .select('*')
        .order('name', { ascending: true });

      if (queryError) {
        setError(queryError.message);
      }

      setChapters((data as TableRow<'chapters'>[] | null) ?? []);
      setLoading(false);
    };

    void loadChapters();
  }, []);

  return (
    <div className="content-container motion-stagger flex flex-col gap-6">
      <header className="panel-surface p-6 sm:p-8 lg:p-10">
        <span className="eyebrow">Membership and Chapter</span>
        <h1 className="section-title mt-3">Join and Build With Us</h1>
        <p className="section-lead max-w-3xl">
          Apply as a member or launch a chapter in your school or community. Choose a tab
          below to begin.
        </p>
      </header>

      <section className="panel-surface p-2 sm:p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleTabChange('member')}
            className={`${activeTab === 'member' ? 'btn-primary' : 'btn-ghost'} w-full`}
          >
            Member
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('chapter')}
            className={`${activeTab === 'chapter' ? 'btn-primary' : 'btn-ghost'} w-full`}
          >
            Create a Chapter
          </button>
        </div>
      </section>

      {activeTab === 'member' ? (
        <section className="panel-surface p-4 sm:p-6 lg:p-8">
          <h2 className="text-3xl font-extrabold text-slate-900">Become a Member</h2>
          <p className="section-lead mt-2">
            Complete the form below to submit your membership application.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-white">
            <iframe
              title="YSP Membership Form"
              src={memberEmbedUrl}
              className="h-[920px] w-full"
              loading="lazy"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a href={memberFormUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Open Form
            </a>
            <p className="text-sm text-slate-500">
              If the embed does not load on your device, use this button to open the form.
            </p>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <article className="panel-surface p-4 sm:p-6 lg:p-8">
            <h2 className="text-3xl font-extrabold text-slate-900">Create a Chapter</h2>
            <p className="section-lead mt-2">You will be contacted if approved.</p>

            <div className="mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-white">
              <iframe
                title="YSP Create Chapter Form"
                src={chapterEmbedUrl}
                className="h-[920px] w-full"
                loading="lazy"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={chapterFormUrl} target="_blank" rel="noreferrer" className="btn-primary">
                Open Form
              </a>
              <p className="text-sm text-slate-500">
                If the embed does not load on your device, use this button to open the form.
              </p>
            </div>
          </article>

          <article className="panel-surface space-y-4 p-6 sm:p-8">
            <div>
              <span className="eyebrow">Chapter Directory</span>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-900">Current Chapters</h3>
            </div>

            {error ? <ErrorState message={error} /> : null}

            {loading ? (
              <LoadingState label="Loading chapters..." />
            ) : chapters.length === 0 ? (
              <EmptyState title="No chapters listed yet" description="New chapters will appear here." />
            ) : (
              <ChaptersGrid chapters={chapters} />
            )}
          </article>
        </section>
      )}
    </div>
  );
};
