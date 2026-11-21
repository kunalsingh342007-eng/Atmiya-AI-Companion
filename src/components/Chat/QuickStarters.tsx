import React from 'react';
import { Code2, Lightbulb, Smile, Sparkles } from 'lucide-react';

interface QuickStartersProps {
  onSelectPrompt: (promptText: string) => void;
  compact?: boolean;
}

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
  return (
    <div className={`w-full mx-auto animate-fadeIn ${compact ? 'my-2 px-1' : 'max-w-2xl my-4 px-2'}`}>
      <div className={compact ? 'mb-3' : 'text-center mb-4'}>
        <h3
          className={`font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 ${
            compact ? 'text-sm' : 'text-base justify-center'
          }`}
        >
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
          <span>Where would you like to start?</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pick a starter or speak/type in Hindi, Hinglish, or English.
        </p>
      </div>

      <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
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
