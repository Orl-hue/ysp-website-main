import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="content-container">
      <div className="panel-surface mx-auto max-w-3xl p-8 text-center sm:p-10">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 text-4xl font-extrabold text-slate-900">Page not found</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
          The page you are trying to open does not exist or may have been moved.
        </p>
        <Link to="/" className="btn-primary mt-7">
          Go to Home
        </Link>
      </div>
    </div>
  );
};
