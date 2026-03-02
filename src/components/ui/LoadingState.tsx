interface LoadingStateProps {
  label?: string;
}

export const LoadingState = ({ label = 'Loading...' }: LoadingStateProps) => {
  return (
    <div className="panel-surface flex min-h-[200px] items-center justify-center p-8">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 sm:text-base">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" />
        {label}
      </div>
    </div>
  );
};
