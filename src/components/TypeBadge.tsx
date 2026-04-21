import React from 'react';
import clsx from 'clsx';

interface TypeBadgeProps {
  isLesson?: boolean;
  className?: string;
}

export default function TypeBadge({ isLesson, className }: TypeBadgeProps) {
  return (
    <span className={clsx(
      "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-tighter mr-2 select-none",
      isLesson 
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50" 
        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50",
      className
    )}>
      {isLesson ? '강습' : '파티'}
    </span>
  );
}
