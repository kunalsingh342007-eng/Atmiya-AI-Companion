import React from 'react';
import { Check } from 'lucide-react';

interface ToastBannerProps {
  message: string | null;
  topOffsetClass?: string;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({
  message,
  topOffsetClass = 'top-16',
}) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed ${topOffsetClass} right-4 sm:right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 dark:bg-[#0b1528]/95 border border-slate-200 dark:border-blue-400/30 text-slate-900 dark:text-white text-xs font-medium shadow-xl backdrop-blur-md animate-fadeIn max-w-[90vw]`}
    >
      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span className="truncate">{message}</span>
    </div>
  );
};
