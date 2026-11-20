import React from 'react';
import { AvatarAppearanceConfig } from '../../types/companion';
import { GlbInspectionReport } from './RealisticAvatar';
import { Palette, Sparkles, Box, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface AvatarCustomizerProps {
  config: AvatarAppearanceConfig;
  onChange: (newConfig: AvatarAppearanceConfig) => void;
  isOpen: boolean;
  onClose: () => void;
  glbInspection?: GlbInspectionReport | null;
}

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
  glbInspection,
}) => {
  if (!isOpen) return null;

  const activeType = config.avatarType || '3d-glb';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-semibold tracking-wide">
              Companion Avatar & Appearance (अवतार सेटिंग्स)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Avatar Mode Selector: 3D GLB vs 2D Custom Portrait */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Avatar Renderer Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() =>
                  onChange({
                    ...config,
                    avatarType: '3d-glb',
                    glbModelPath: config.glbModelPath || '/models/atmiya-avatar.glb',
                  })
                }
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  activeType === '3d-glb'
                    ? 'border-violet-500 bg-violet-950/40 text-violet-100'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-xs">
                  <span className="flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-violet-400" />
                    3D GLB Avatar
                  </span>
                  {activeType === '3d-glb' && (
                    <CheckCircle2 className="w-4 h-4 text-violet-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Loads <code className="text-violet-300">/models/atmiya-avatar.glb</code> with automatic 2D fallback.
                </p>
              </button>

              <button
                onClick={() =>
                  onChange({
                    ...config,
                    avatarType: 'custom-image',
                    customImagePath: config.customImagePath || '/avatars/atmiya.png',
                  })
                }
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  activeType === 'custom-image'
                    ? 'border-violet-500 bg-violet-950/40 text-violet-100'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-xs">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    2D Portrait Avatar
                  </span>
                  {activeType === 'custom-image' && (
                    <CheckCircle2 className="w-4 h-4 text-violet-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Uses lightweight <code className="text-cyan-300">/avatars/atmiya.png</code> portrait.
                </p>
              </button>
            </div>
          </div>

          {/* Live GLB Inspection Summary (when a GLB model is loaded) */}
          {glbInspection && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Inspected GLB Asset ({glbInspection.modelUrl})
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                <div>Meshes: {glbInspection.meshes.length}</div>
                <div>Bones: {glbInspection.bones.length}</div>
                <div>Clips: {glbInspection.animations.length}</div>
                <div>Morphs: {glbInspection.morphTargets.length}</div>
              </div>
              <div className="text-[11px] text-slate-400">
                Idle clip: {glbInspection.activeIdleClip || 'None found (static pose)'}
                {' • '}
                Speech morphs:{' '}
                {glbInspection.hasFacialControls
                  ? glbInspection.activeSpeechMorphs.join(', ')
                  : 'None detected in GLB'}
              </div>
            </div>
          )}

          {/* Companion Display Name */}
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

          {/* Accent Aura Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Accent Aura Lighting
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

          {/* Animation & Lip-Sync Architectural Transparency */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 space-y-2 leading-relaxed">
            <span className="font-semibold text-violet-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" /> 3D Rigging & Lip-Sync Behavior
            </span>
            <p className="text-[11px] text-slate-300">
              Ātmiya inspects the GLB asset at runtime for real animation clips and speech morph
              targets (e.g., <code className="text-violet-300">jawOpen</code>,{' '}
              <code className="text-violet-300">viseme_aa</code>). If the GLB has no facial morph
              targets, lip-sync is not faked and the avatar uses state-driven lighting and fallback
              portrait framing cleanly.
            </p>
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
