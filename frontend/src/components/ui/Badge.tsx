import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'forest' | 'lime' | 'stone' | 'amber' | 'rose' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'forest',
  children,
  ...props
}) => {
  const variants = {
    forest:
      'bg-[#1b3b2b]/10 text-[#1b3b2b] border-[#1b3b2b]/20 dark:bg-[#2d5f47]/20 dark:text-[#86efac] dark:border-[#2d5f47]/40',
    lime:
      'bg-[#84cc16]/15 text-[#3f6212] border-[#84cc16]/30 dark:bg-[#84cc16]/20 dark:text-[#bef264] dark:border-[#84cc16]/30',
    stone:
      'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
    amber:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    rose:
      'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    outline:
      'border-stone-300 text-stone-700 dark:border-stone-700 dark:text-stone-300 bg-transparent',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
