import React from 'react';
import { 
  HeartHandshake, 
  Code2, 
  Calendar, 
  Lightbulb, 
  BookOpen, 
  Sparkles,
  Smile
} from 'lucide-react';

interface QuickStartersProps {
  onSelectPrompt: (promptText: string) => void;
}

const STARTER_PROMPTS = [
  {
    category: 'बातचीत (Casual & Heart)',
    icon: <Smile className="w-3.5 h-3.5 text-pink-400" />,
    prompts: [
      {
        label: 'आज मुझसे थोड़ी बात करो',
        text: 'Aaj mujhse thodi baat karo, I want to talk about how my day went.',
      },
      {
        label: 'Help me understand my feelings',
        text: 'Help me understand my feelings and find a little calm today.',
      },
    ],
  },
  {
    category: 'कोडिंग और पढ़ाई (Code & Study)',
    icon: <Code2 className="w-3.5 h-3.5 text-cyan-400" />,
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
    icon: <Lightbulb className="w-3.5 h-3.5 text-amber-400" />,
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

export const QuickStarters: React.FC<QuickStartersProps> = ({ onSelectPrompt }) => {
  return (
    <div className="w-full max-w-2xl mx-auto my-6 px-4 animate-fadeIn">
      <div className="text-center mb-5">
        <h3 className="text-base font-semibold text-slate-200 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          Where would you like to start? (शुरुआत कहाँ से करें?)
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Pick a thought, or ask anything freely in Hindi, Hinglish, or English.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STARTER_PROMPTS.map((group, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 transition flex flex-col gap-2.5 backdrop-blur-sm"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              {group.icon}
              <span>{group.category}</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.prompts.map((p, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => onSelectPrompt(p.text)}
                  className="text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-violet-950/40 border border-slate-800/60 hover:border-violet-500/40 text-xs text-slate-300 hover:text-violet-200 transition cursor-pointer"
                >
                  <span className="font-medium block">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
