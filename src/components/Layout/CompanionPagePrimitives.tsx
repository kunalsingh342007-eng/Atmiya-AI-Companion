import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface SubpageBackdropProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared canvas container for History, Play Games, Mini-Games, and Settings.
 * Uses unified Light and Dark/Night surface tokens for consistent visual depth.
 */
export const SubpageBackdrop: React.FC<SubpageBackdropProps> = ({
  children,
  className = '',
}) => (
  <div
    className={`relative h-full w-full overflow-y-auto bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-200 ${className}`}
  >
    {/* Subtle atmospheric glow (Dark/Night mode only) */}
    <div
      aria-hidden="true"
      className="hidden dark:block pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          'radial-gradient(circle at 28% 22%, rgba(37, 99, 235, 0.16), transparent 46%), radial-gradient(circle at 78% 72%, rgba(124, 58, 237, 0.14), transparent 48%), radial-gradient(circle at 52% 50%, rgba(56, 189, 248, 0.06), transparent 62%)',
      }}
    />
    <div className="relative z-10 min-h-full w-full flex flex-col">
      {children}
    </div>
  </div>
);

interface BackPillButtonProps {
  label?: string;
  onClick: () => void;
  className?: string;
}

export const BackPillButton: React.FC<BackPillButtonProps> = ({
  label = 'Back',
  onClick,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[var(--bg-surface)]/95 hover:bg-[var(--bg-elevated)] dark:bg-[#0b1638]/85 dark:hover:bg-[#142456] border border-slate-200 dark:border-indigo-400/28 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white text-xs font-medium backdrop-blur-md shadow-xs dark:shadow-[0_6px_18px_rgba(2,6,23,0.45)] transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}
  >
    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
    <span>{label}</span>
  </button>
);

interface PageHeadingProps {
  title: string;
  subtitle: string;
  align?: 'left' | 'center';
}

export const PageHeading: React.FC<PageHeadingProps> = ({
  title,
  subtitle,
  align = 'left',
}) => (
  <header className={align === 'center' ? 'text-center' : 'text-left'}>
    <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
      {title}
    </h1>
    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300/85 mt-1">
      {subtitle}
    </p>
  </header>
);
