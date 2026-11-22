import React from 'react';
import { Code2, Lightbulb, Smile, Sparkles } from 'lucide-react';

interface QuickStartersProps {
  onSelectPrompt: (promptText: string) => void;
  compact?: boolean;
}

const COMPACT_SUGGESTIONS = [
  {
    label: 'Talk about my day',
    sublabel: 'Warm conversation in Hinglish or English',
    text: 'Aaj mujhse thodi baat karo, I want to talk about how my day went.',
    icon: <Smile className="w-3.5 h-3.5 text-sky-500 dark:text-sky-300 shrink-0" />,
  },
  {
    label: 'Study & coding help',
    sublabel: 'Clear intuition & step-by-step guidance',
    text: 'Mujhe C++ mein arrays and pointers simple Hinglish mein intuition ke saath samjhao.',
    icon: <Code2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-300 shrink-0" />,
  },
  {
    label: 'Plan & brainstorm ideas',
    sublabel: 'Organize goals or explore new concepts',
    text: 'Can you help me design an effective, stress-free plan for what I want to get done today?',
    icon: <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300 shrink-0" />,
  },
];

const STARTER_PROMPTS = [
  {
    category: 'बातचीत (Casual & Heart)',
    icon: <Smile className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />,
    prompts: [
      {
        label: 'आज मुझसे थोड़ी बात करो',
        text: 'Aaj mujhse thodi baat karo, I want to talk about how my day went.',
      },
      {
        label: 'Help me find a little calm',
        text: 'Help me understand my feelings and find a little calm today.',
      },
    ],
  },
  {
    category: 'कोडिंग और पढ़ाई (Code & Study)',
    icon: <Code2 className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />,
    prompts: [
      {
        label: 'C++ Arrays & Pointers in Hinglish',
        text: 'Mujhe C++ mein arrays and pointers simple Hinglish mein intuition ke saath samjhao.',
      },
      {
        label: 'Plan my study schedule',
        text: 'Can you help me design an effective, stress-free daily study routine for my exams?',
      },
    ],
  },
  {
    category: 'योजना और विचार (Planning & Ideas)',
    icon: <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
    prompts: [
      {
        label: 'Brainstorm robotics project',
        text: 'Can we brainstorm an interesting robotics or AI hardware companion project idea?',
      },
      {
        label: 'Tell me something fascinating',
        text: 'Tell me something fascinating about the human mind or astrophysics in Hindi.',
      },
    ],
  },
];

export const QuickStarters: React.FC<QuickStartersProps> = ({
  onSelectPrompt,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="w-full space-y-2 animate-fadeIn">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
          Suggestions
        </div>
        <div className="flex flex-col gap-2">
          {COMPACT_SUGGESTIONS.slice(0, 3).map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.text)}
              className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50/90 dark:bg-[#0d1930]/80 hover:bg-blue-50 dark:hover:bg-[#132546] border border-slate-200/80 dark:border-sky-400/15 hover:border-blue-300 dark:hover:border-sky-400/35 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                  {item.label}
                </span>
              </div>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 pl-5.5">
                {item.sublabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto animate-fadeIn my-4 px-2">
      <div className="text-center mb-4">
        <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
          <span>Where would you like to start?</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pick a starter or speak/type in Hindi, Hinglish, or English.
        </p>
      </div>

      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3">
        {STARTER_PROMPTS.map((group, idx) => (
          <div
            key={idx}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0d182e]/85 border border-slate-200 dark:border-slate-800/80 flex flex-col gap-2"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {group.icon}
              <span>{group.category}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {group.prompts.map((p, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => onSelectPrompt(p.text)}
                  className="text-left px-2.5 py-2 rounded-xl bg-white dark:bg-[#081020] hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/40 text-xs text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-sky-200 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="font-medium block leading-snug">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
