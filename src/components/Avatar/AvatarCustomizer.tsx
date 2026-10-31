import React from 'react';
import { AvatarAppearanceConfig } from '../../types/companion';
import { Palette, Check, Sparkles, UserCheck } from 'lucide-react';

interface AvatarCustomizerProps {
  config: AvatarAppearanceConfig;
  onChange: (newConfig: AvatarAppearanceConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_PERSONAS = [
  {
    name: 'Ātmiya',
    vibe: 'female' as const,
    color: '#8b5cf6', // violet
    style: 'modern-casual' as const,
    description: 'सौम्य और स्नेही (Gentle, empathetic, soothing companion)',
  },
  {
    name: 'Āryan',
    vibe: 'male' as const,
    color: '#06b6d4', // cyan
    style: 'tech-hoodie' as const,
    description: 'उत्साही और जिज्ञासु (Curious, spirited, coding & tech partner)',
  },
  {
    name: 'Meera',
    vibe: 'female' as const,
    color: '#ec4899', // rose pink
    style: 'traditional-kurta' as const,
    description: 'शांत और ज्ञानी (Thoughtful, reflective, literature & life lover)',
  },
  {
    name: 'Kabir',
    vibe: 'male' as const,
    color: '#f59e0b', // warm amber
    style: 'modern-casual' as const,
    description: 'दार्शनिक और स्पष्ट (Philosophical, calm clarity, grounded guide)',
  },
];

const ACCENT_COLORS = [
  { label: 'Violet (वायलेट)', value: '#8b5cf6' },
  { label: 'Cyan (स्यान)', value: '#06b6d4' },
  { label: 'Rose (गुलाबी)', value: '#ec4899' },
  { label: 'Amber (सुनहरा)', value: '#f59e0b' },
  { label: 'Emerald (पन्ना)', value: '#10b981' },
];

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({
  config,
  onChange,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-semibold tracking-wide">
              Avatar & Companion Persona (अवतार अनुकूलन)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Persona selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Persona Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_PERSONAS.map((p) => {
                const isSelected = config.personaName === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() =>
                      onChange({
                        ...config,
                        personaName: p.name,
                        genderVibe: p.vibe,
                        accentColor: p.color,
                        clothingStyle: p.style,
                      })
                    }
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-violet-500 bg-violet-950/40 shadow-md shadow-violet-900/30'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                        {p.name}
                        {isSelected && <Check className="w-4 h-4 text-violet-400" />}
                      </span>
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Companion Display Name
            </label>
            <input
              type="text"
              value={config.personaName}
              onChange={(e) => onChange({ ...config, personaName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500 transition"
              placeholder="e.g. Ātmiya, Mitr, Saathi"
            />
          </div>

          {/* Accent Color Palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Accent Aura Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => onChange({ ...config, accentColor: c.value })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
                    config.accentColor === c.value
                      ? 'border-white text-white font-medium bg-white/10'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: c.value }}
                  />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Architectural note on future 3D/hardware robotics integration */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
            <span className="font-semibold text-violet-300 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Hardware & 3D Integration Ready
            </span>
            Ātmiya's avatar state machine is decoupled from the renderer. In the future, this state
            driver connects directly via WebSockets or serial protocol to physical robotic heads (neck pan/tilt, OLED eyes, speaker visemes).
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition shadow-lg shadow-violet-900/40 cursor-pointer"
          >
            Done (सहेजें)
          </button>
        </div>
      </div>
    </div>
  );
};
