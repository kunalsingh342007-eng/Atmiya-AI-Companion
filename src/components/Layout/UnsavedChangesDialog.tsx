import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesDialogProps {
  kind: 'wardrobe' | 'memories' | null;
  onStay: () => void;
  onDiscard: () => void;
  onApplyAndLeave?: () => void;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  kind,
  onStay,
  onDiscard,
  onApplyAndLeave,
}) => {
  if (!kind) return null;

  const isWardrobe = kind === 'wardrobe';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-dialog-title"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/35 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2
              id="unsaved-dialog-title"
              className="text-sm font-bold text-slate-900 dark:text-white"
            >
              {isWardrobe ? 'Unsaved customization changes' : 'Unsaved memory draft'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isWardrobe
                ? 'You have unapplied changes in Customize. Would you like to apply them before leaving, or discard them?'
                : 'You have an unsubmitted memory draft open. Leaving now will discard the unsaved text.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onStay}
            className="h-9 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            Stay Here
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="h-9 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-500/40 text-xs font-semibold text-rose-700 dark:text-rose-200 cursor-pointer"
          >
            Discard &amp; Leave
          </button>
          {isWardrobe && onApplyAndLeave && (
            <button
              type="button"
              onClick={onApplyAndLeave}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
            >
              Apply &amp; Leave
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
