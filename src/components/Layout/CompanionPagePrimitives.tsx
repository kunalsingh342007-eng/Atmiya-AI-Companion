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
    {/* Subtle warm daylight radial wash (Light mode only) */}
    <div
      aria-hidden="true"
      className="dark:hidden pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          'radial-gradient(circle at 22% 16%, rgba(251, 191, 36, 0.09), transparent 44%), radial-gradient(circle at 82% 78%, rgba(55, 73, 230, 0.06), transparent 48%)',
      }}
    />
    {/* Subtle calm atmospheric wash (Dark/Night mode only) */}
    <div
      aria-hidden="true"
      className="hidden dark:block pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          'radial-gradient(circle at 26% 18%, rgba(99, 116, 255, 0.13), transparent 46%), radial-gradient(circle at 78% 76%, rgba(251, 191, 36, 0.05), transparent 48%)',
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
    className={`atmiya-glass-interactive inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${className}`}
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
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight [text-wrap:balance]">
      {title}
    </h1>
    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
      {subtitle}
    </p>
  </header>
);
