import React, { useState } from 'react';
import { Gamepad2, GraduationCap, MessageCircle, RefreshCw, Sparkles, X } from 'lucide-react';

interface QuickStartersProps {
  onSelectPrompt: (promptText: string) => void;
  onDismiss?: () => void;
  compact?: boolean;
}

const SUGGESTION_SETS = [
  [
    {
      label: "Let's talk.",
      text: "Let's talk! Ask me how my day went and chat naturally.",
      icon: MessageCircle,
      iconColor: 'text-[var(--accent-primary)]',
    },
    {
      label: 'Teach me something.',
      text: 'Teach me something fascinating and easy to grasp in simple terms.',
      icon: GraduationCap,
      iconColor: 'text-emerald-600 dark:text-emerald-300',
    },
    {
      label: "Let's play a game.",
      text: "Let's play a quick riddle or word game together!",
      icon: Gamepad2,
      iconColor: 'text-[var(--accent-warm)]',
    },
  ],
  [
    {
      label: 'Help me plan my day.',
      text: 'Can you help me design an effective, stress-free plan for what I want to do today?',
      icon: Sparkles,
      iconColor: 'text-[var(--accent-primary)]',
    },
    {
      label: 'Practice Hinglish chat.',
      text: 'Aaj mujhse thodi baat Hinglish mein karo so I can practice speaking comfortably.',
      icon: MessageCircle,
      iconColor: 'text-cyan-600 dark:text-cyan-300',
    },
    {
      label: 'Share a calming thought.',
      text: 'Help me slow down and share a calm, grounding perspective right now.',
      icon: GraduationCap,
      iconColor: 'text-emerald-600 dark:text-emerald-300',
    },
  ],
];

export const QuickStarters: React.FC<QuickStartersProps> = ({
  onSelectPrompt,
  onDismiss,
}) => {
  const [setIndex, setSetIndex] = useState(0);
  const activeSuggestions = SUGGESTION_SETS[setIndex % SUGGESTION_SETS.length];

  return (
    <div className="w-full space-y-2 atmiya-blur-fade">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Try saying
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSetIndex((i) => (i + 1) % SUGGESTION_SETS.length)}
            aria-label="Swap suggestions"
            title="Show other suggestions"
            className="h-7 px-2 rounded-md text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] inline-flex items-center gap-1 transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Swap</span>
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss suggestions"
              title="Dismiss suggestions"
              className="h-7 w-7 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] inline-flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {activeSuggestions.slice(0, 3).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectPrompt(item.text)}
              className="w-full min-h-[40px] text-left px-3 py-2 rounded-xl atmiya-card-subtle hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] transition cursor-pointer flex items-center gap-2.5"
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${item.iconColor}`} />
              <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
