import React, { useEffect, useState } from 'react';
import {
  AVATAR_EMOTIONS,
  AVATAR_EMOTION_LABELS,
  AvatarAppearanceConfig,
  GameProgress,
  PortraitAccessoryId,
  RoomConfig,
  RoomEnvironmentId,
} from '../../types/companion';
import { DEFAULT_AVATAR_CONFIG, DEFAULT_ROOM_CONFIG } from '../../services/storage';
import { CompanionAvatar } from '../Avatar/CompanionAvatar';
import { CompanionRoom } from '../Room/CompanionRoom';
import type { GlbInspectionReport } from '../Avatar/RealisticAvatar';
import {
  Award,
  Box,
  Check,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Info,
  Lock,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react';

interface WardrobeScreenProps {
  config: AvatarAppearanceConfig;
  roomConfig?: RoomConfig;
  progress: GameProgress;
  glbInspection?: GlbInspectionReport | null;
  onApplyWardrobe: (newAvatar: AvatarAppearanceConfig, newRoom: RoomConfig) => void;
  onNavigatePlay: () => void;
}

const ROOM_OPTIONS: {
  id: RoomEnvironmentId;
  title: string;
  desc: string;
  lightingMood: RoomConfig['lightingMood'];
  requiredXp: number;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'sunlit-study',
    title: 'Sunlit Sage Study',
    desc: 'Warm daylight window, sage walls, cream bedding, oak bookshelf.',
    lightingMood: 'natural',
    requiredXp: 0,
    icon: Sun,
  },
  {
    id: 'evening-lounge',
    title: 'Evening Lamp Lounge',
    desc: 'Cozy twilight window, warm bedside lamp glow, muted blue accents.',
    lightingMood: 'soft-evening',
    requiredXp: 0,
    icon: Moon,
  },
  {
    id: 'indigo-loft',
    title: 'Indigo Twilight Loft',
    desc: 'Skylight stars, soft indigo twilight glow, calm evening warmth.',
    lightingMood: 'soft-evening',
    requiredXp: 25,
    icon: Sparkles,
  },
  {
    id: 'cream-solarium',
    title: 'Warm Cream Solarium',
    desc: 'Arched sunlit glasshouse in warm cream and soft coral light.',
    lightingMood: 'warm',
    requiredXp: 50,
    icon: Sun,
  },
];

const OUTFIT_PALETTES = [
  { label: 'Navy Classic', color: '#1e3a5f' },
  { label: 'Soft Indigo', color: '#4f46e5' },
  { label: 'Violet Dusk', color: '#7c3aed' },
  { label: 'Sky Mist', color: '#0284c7' },
  { label: 'Coral Dawn', color: '#e11d48' },
];

const ACCESSORIES: { id: PortraitAccessoryId; label: string; desc: string }[] = [
  { id: 'none', label: 'None', desc: 'Clean portrait look' },
  { id: 'lotus-pin', label: 'Lotus Pin', desc: 'Corner floral badge' },
  { id: 'star-clip', label: 'Starlight Clip', desc: 'Warm gold star accent' },
  { id: 'glasses-frame', label: 'Reading Glasses', desc: 'Scholarly frame badge' },
];

export const WardrobeScreen: React.FC<WardrobeScreenProps> = ({
  config,
  roomConfig = DEFAULT_ROOM_CONFIG,
  progress,
  glbInspection,
  onApplyWardrobe,
  onNavigatePlay,
}) => {
  const [draftAvatar, setDraftAvatar] = useState<AvatarAppearanceConfig>(config);
  const [draftRoom, setDraftRoom] = useState<RoomConfig>(roomConfig);

  useEffect(() => {
    setDraftAvatar(config);
  }, [config]);

  useEffect(() => {
    setDraftRoom(roomConfig);
  }, [roomConfig]);

  const hasChanges =
    JSON.stringify(draftAvatar) !== JSON.stringify(config) ||
    JSON.stringify(draftRoom) !== JSON.stringify(roomConfig);

  const handleApply = () => {
    onApplyWardrobe(draftAvatar, draftRoom);
  };

  const handleReset = () => {
    const resetAvatar: AvatarAppearanceConfig = {
      ...DEFAULT_AVATAR_CONFIG,
      customImagePath: config.customImagePath || '/avatars/atmiya.png',
    };
    const resetRoom: RoomConfig = { ...DEFAULT_ROOM_CONFIG };
    setDraftAvatar(resetAvatar);
    setDraftRoom(resetRoom);
    onApplyWardrobe(resetAvatar, resetRoom);
  };

  const activeType = draftAvatar.avatarType || 'three-ws';

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/35 to-slate-950 px-4 sm:px-6 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-300/35 text-rose-200 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Wardrobe & Companion Room
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Preview room themes, portrait accents, and overlay accessories before applying.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="h-10 px-4 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={!hasChanges}
              className={`h-10 px-5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:cursor-default ${
                hasChanges
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400 border border-white/10'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{hasChanges ? 'Apply Changes' : 'Applied'}</span>
            </button>
          </div>
        </header>

        {/* Main Grid: Live Preview + Customization Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Live Preview Card + Transparency Note */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl overflow-hidden border border-indigo-300/25 shadow-2xl bg-slate-900">
              <div className="px-4 py-2.5 bg-slate-950/90 border-b border-white/10 flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-200">Live Stage Preview</span>
                <span className="text-slate-400">
                  {hasChanges ? 'Previewing draft' : 'Current active look'}
                </span>
              </div>
              <div className="h-72 relative">
                <CompanionRoom roomConfig={draftRoom} avatarState="idle" prefersReducedMotion>
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <CompanionAvatar
                      stageVariant="immersive"
                      state="idle"
                      emotion="smile"
                      config={draftAvatar}
                      compactPreview
                    />
                    <div className="mt-2 px-3 py-1 rounded-full bg-slate-950/75 border border-white/15 text-[11px] text-slate-100 font-medium backdrop-blur-md">
                      {draftAvatar.personaName || 'Ātmiya'} · {draftAvatar.outfitStyleLabel || 'Navy Classic'}
                    </div>
                  </div>
                </CompanionRoom>
              </div>
            </div>

            {/* Honesty & Scope Disclosure */}
            <div className="rounded-2xl bg-slate-900/85 border border-sky-400/25 p-4 text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <div className="font-semibold text-sky-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 shrink-0" />
                <span>About Visual Customization</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Room themes, outfit palette trims, and badge accessories customize the companion stage and 2D portrait frame. Changing colors or overlays here does not alter a 3D <code className="text-sky-200">.glb</code> mesh’s geometry unless the uploaded 3D model includes custom material/morph slots.
              </p>
            </div>

            {/* Live GLB Inspection Summary if a 3D GLB was loaded */}
            {glbInspection && (
              <div className="rounded-2xl bg-slate-900/85 border border-emerald-500/30 p-4 text-xs space-y-2">
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Loaded 3D Asset ({glbInspection.modelUrl})</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Meshes: {glbInspection.meshes.length} · Bones: {glbInspection.bones.length} · Morphs: {glbInspection.morphTargets.length}
                </div>
                <div className="flex flex-wrap gap-1">
                  {AVATAR_EMOTIONS.slice(0, 8).map((expr) => (
                    <span
                      key={expr}
                      className={`px-1.5 py-0.5 rounded text-[10px] border ${
                        glbInspection.supportedExpressions[expr]
                          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {AVATAR_EMOTION_LABELS[expr]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Room Themes, Outfit Accent, Accessories & Display Name */}
          <div className="lg:col-span-7 space-y-5">
            {/* Room Backgrounds */}
            <section className="rounded-3xl bg-slate-900/85 border border-indigo-300/20 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white">Room Backgrounds</h2>
                <span className="text-[11px] text-sky-200 font-medium tabular-nums">
                  {progress.unlockedRoomIds.length}/{ROOM_OPTIONS.length} unlocked · {progress.xp} XP
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROOM_OPTIONS.map((room) => {
                  const Icon = room.icon;
                  const isUnlocked =
                    room.requiredXp === 0 || progress.unlockedRoomIds.includes(room.id);
                  const isSelected = draftRoom.environment === room.id;

                  return (
                    <button
                      key={room.id}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() =>
                        setDraftRoom({
                          environment: room.id,
                          lightingMood: room.lightingMood,
                        })
                      }
                      className={`p-3.5 rounded-2xl border text-left transition ${
                        !isUnlocked
                          ? 'border-slate-800 bg-slate-950/50 text-slate-400 cursor-not-allowed opacity-80'
                          : isSelected
                          ? 'border-indigo-400 bg-indigo-950/60 text-white cursor-pointer shadow-md'
                          : 'border-white/10 bg-slate-950/60 text-slate-200 hover:border-indigo-300/40 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-xs">
                        <span className="flex items-center gap-1.5">
                          <Icon className="w-4 h-4 text-amber-300 shrink-0" />
                          {room.title}
                        </span>
                        {!isUnlocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-200">
                            <Lock className="w-3 h-3" />
                            {room.requiredXp} XP
                          </span>
                        ) : isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-indigo-300 shrink-0" />
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{room.desc}</p>
                    </button>
                  );
                })}
              </div>

              {progress.unlockedRoomIds.length < ROOM_OPTIONS.length && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-300">
                  <span>Play mini-games to earn XP and unlock remaining rooms.</span>
                  <button
                    type="button"
                    onClick={onNavigatePlay}
                    className="text-sky-300 hover:text-sky-200 font-semibold underline cursor-pointer"
                  >
                    Go to Play Hub
                  </button>
                </div>
              )}
            </section>

            {/* Outfit Palette Accent & Overlay Accessories */}
            <section className="rounded-3xl bg-slate-900/85 border border-indigo-300/20 p-5 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Outfit Frame & Theme Palette
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Updates portrait rim trim and room glow accent.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {OUTFIT_PALETTES.map((item) => {
                    const isSelected = (draftAvatar.outfitColor || '#1e3a5f') === item.color;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() =>
                          setDraftAvatar({
                            ...draftAvatar,
                            outfitColor: item.color,
                            outfitStyleLabel: item.label,
                            accentColor: item.color,
                          })
                        }
                        className={`h-10 px-3.5 rounded-full border text-xs font-medium inline-flex items-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'border-white bg-white/15 text-white'
                            : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-indigo-300/40'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-white">Portrait Overlay Accessories</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Optional decorative badges displayed on the 2D companion portrait frame.
                </p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACCESSORIES.map((acc) => {
                    const isSelected = (draftAvatar.accessory || 'none') === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setDraftAvatar({ ...draftAvatar, accessory: acc.id })}
                        className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-950/60 text-white'
                            : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-indigo-300/40'
                        }`}
                      >
                        <div className="text-xs font-semibold">{acc.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{acc.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Display Name & Renderer Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Companion Display Name
                  </label>
                  <input
                    type="text"
                    value={draftAvatar.personaName}
                    onChange={(e) =>
                      setDraftAvatar({ ...draftAvatar, personaName: e.target.value })
                    }
                    placeholder="Ātmiya"
                    className="w-full h-10 bg-slate-950 border border-white/15 rounded-xl px-3.5 text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Avatar Renderer Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDraftAvatar({
                          ...draftAvatar,
                          avatarType: 'three-ws',
                          threeWsMigrated: true,
                        })
                      }
                      className={`h-10 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                        activeType === 'three-ws'
                          ? 'border-indigo-400 bg-indigo-950/60 text-white'
                          : 'border-white/10 bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span className="truncate">3D Avatar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftAvatar({
                          ...draftAvatar,
                          avatarType: '3d-glb',
                          threeWsMigrated: true,
                          glbModelPath: draftAvatar.glbModelPath || '/models/atmiya-avatar.glb',
                        })
                      }
                      className={`h-10 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                        activeType === '3d-glb'
                          ? 'border-indigo-400 bg-indigo-950/60 text-white'
                          : 'border-white/10 bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                      <span className="truncate">Local GLB</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftAvatar({
                          ...draftAvatar,
                          avatarType: 'custom-image',
                          threeWsMigrated: true,
                          customImagePath: draftAvatar.customImagePath || '/avatars/atmiya.png',
                        })
                      }
                      className={`h-10 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                        activeType === 'custom-image'
                          ? 'border-indigo-400 bg-indigo-950/60 text-white'
                          : 'border-white/10 bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                      <span className="truncate">2D Portrait</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Companion Progress: Achievements & Recent Interactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <section className="rounded-3xl bg-slate-900/85 border border-indigo-300/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-300" />
                <span>Unlocked Achievements ({progress.achievements.length})</span>
              </h2>
            </div>
            {progress.achievements.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                Play any mini-game or tap Wave/Cheer on Home to earn your first badge.
              </p>
            ) : (
              <div className="space-y-2">
                {progress.achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-amber-300/20 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-semibold text-amber-100">{ach.title}</div>
                      <div className="text-[11px] text-slate-400">{ach.description}</div>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {new Date(ach.unlockedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-slate-900/85 border border-indigo-300/20 p-5 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-300" />
              <span>Recent Companion Activity</span>
            </h2>
            {progress.interactionHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                Your recent mini-game finishes and playful interactions will appear here.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {progress.interactionHistory.slice(0, 8).map((entry) => (
                  <div
                    key={entry.id}
                    className="px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-slate-200 truncate">{entry.label}</span>
                    <span className="text-sky-300 font-semibold tabular-nums shrink-0">
                      +{entry.xpEarned} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
