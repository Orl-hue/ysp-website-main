import type { TableRow } from '../types/database';

interface ChaptersGridProps {
  chapters: TableRow<'chapters'>[];
}

export const ChaptersGrid = ({ chapters }: ChaptersGridProps) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {chapters.map((chapter, index) => (
        <article key={chapter.id} className="panel-surface p-5 rise-in sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Chapter {String(index + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-1 text-xl font-extrabold text-[#f6421f]">{chapter.name}</h3>
            </div>
            <span className="eyebrow shrink-0">Active</span>
          </div>

          <p className="mt-3 text-sm text-slate-600">{chapter.location || 'Location to be announced'}</p>

          <div className="mt-4 space-y-1 rounded-xl border border-orange-100 bg-orange-50/70 p-3.5 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Chapter Head:</span>{' '}
              {chapter.chapter_head_name || 'Not provided'}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Contact:</span>{' '}
              {chapter.chapter_head_contact || 'Not provided'}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
};

