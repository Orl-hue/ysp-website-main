import { Link } from 'react-router-dom';
import type { TableRow } from '../types/database';

interface ProgramCardProps {
  program: TableRow<'programs'>;
}

export const ProgramCard = ({ program }: ProgramCardProps) => {
  const programPathKey = program.slug || program.id;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 sm:h-56">
        {program.image_url ? (
          <img
            src={program.image_url}
            alt={program.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-[#f6421f]">
            Program image will be added by admin.
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <h3 className="line-clamp-2 text-xl font-extrabold text-[#f6421f]">{program.title}</h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{program.description}</p>
        <Link to={`/programs/${programPathKey}`} className="btn-secondary px-4 py-2">
          Read program
        </Link>
      </div>
    </article>
  );
};

