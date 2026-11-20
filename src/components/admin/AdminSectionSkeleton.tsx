import React from 'react';

interface AdminSectionSkeletonProps {
  variant?: 'dashboard' | 'table' | 'settings' | 'cards';
  label?: string;
}

export const AdminSectionSkeleton: React.FC<AdminSectionSkeletonProps> = ({
  variant = 'table',
  label,
}) => {
  if (variant === 'dashboard') {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label={label || 'Loading dashboard'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5"
            >
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800/70 rounded-md" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 h-64 space-y-3">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="h-44 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 h-64 space-y-3">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
            <div className="space-y-2.5 pt-2">
              {[0, 1, 2, 3].map((r) => (
                <div key={r} className="h-9 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'settings') {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 animate-pulse" aria-busy="true">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-10 w-full bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true">
        <div className="h-10 w-64 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
            >
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/70 rounded-md" />
              <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800/70 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: table variant
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4 animate-pulse" aria-busy="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-40 bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
      <div className="space-y-2.5 pt-1">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="h-12 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
        ))}
      </div>
    </div>
  );
};
