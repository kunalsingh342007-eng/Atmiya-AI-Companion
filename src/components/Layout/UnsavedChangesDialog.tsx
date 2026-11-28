import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesDialogProps {
  kind: 'wardrobe' | 'settings' | null;
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
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-2xl atmiya-card p-5 shadow-2xl space-y-4 atmiya-blur-fade">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/35 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2
              id="unsaved-dialog-title"
              className="text-sm font-bold text-[var(--text-primary)]"
            >
              {isWardrobe ? 'Unsaved appearance changes' : 'Unsaved settings or profile edits'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {isWardrobe
                ? 'You have unapplied stage and room customizations. Would you like to apply them before leaving, or discard them?'
                : 'You have unsaved changes in Settings. Stay to click Save, or discard these edits and leave.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onStay}
            className="h-9 px-3.5 rounded-xl bg-[var(--bg-elevated)] hover:opacity-90 border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer transition"
          >
            Stay Here
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="h-9 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-500/40 text-xs font-semibold text-rose-700 dark:text-rose-200 cursor-pointer transition"
          >
            Discard &amp; Leave
          </button>
          {onApplyAndLeave && (
            <button
              type="button"
              onClick={onApplyAndLeave}
              className="h-9 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-xs font-semibold text-white cursor-pointer transition"
            >
              Apply &amp; Leave
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
