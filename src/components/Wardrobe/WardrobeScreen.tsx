import React, { useState } from 'react';
import {
  AVATAR_EMOTIONS,
  AVATAR_EMOTION_LABELS,
  AvatarAppearanceConfig,
  AvatarEmotion,
  CameraFramingPreset,
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
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Info,
  Lock,
  Moon,
  Palette,
  RotateCcw,
  Smile,
  Sparkles,
  Sun,
  Undo2,
} from 'lucide-react';

interface WardrobeScreenProps {
  config: AvatarAppearanceConfig;
  roomConfig?: RoomConfig;
  draftAvatar?: AvatarAppearanceConfig;
  draftRoom?: RoomConfig;
  onDraftChange?: (avatar: AvatarAppearanceConfig, room: RoomConfig) => void;
  progress: GameProgress;
  glbInspection?: GlbInspectionReport | null;
  previewEmotion?: AvatarEmotion | null;
  activeCameraPreset?: CameraFramingPreset;
  onSelectPreviewEmotion?: (emotion: AvatarEmotion | null) => void;
  onChangeCameraPreset?: (preset: CameraFramingPreset) => void;
  onResetCamera?: () => void;
  onPreviewOnStage?: () => void;
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
  { label: 'Ocean Blue', color: '#2563eb' },
  { label: 'Sky Slate', color: '#0284c7' },
  { label: 'Deep Indigo', color: '#4f46e5' },
  { label: 'Coral Dawn', color: '#e11d48' },
];

const ACCESSORIES: { id: PortraitAccessoryId; label: string; desc: string }[] = [
  { id: 'none', label: 'None', desc: 'Clean portrait look' },
  { id: 'lotus-pin', label: 'Lotus Pin', desc: 'Corner floral badge' },
  { id: 'star-clip', label: 'Starlight Clip', desc: 'Warm gold star accent' },
  { id: 'glasses-frame', label: 'Reading Glasses', desc: 'Scholarly frame badge' },
];

const CAMERA_PRESET_OPTIONS: {
  id: CameraFramingPreset;
  label: string;
  desc: string;
}[] = [
  { id: 'close-up', label: 'Close-Up', desc: 'Portrait face & upper chest framing' },
  { id: 'upper-body', label: 'Upper Body', desc: 'Eye-level seated torso, chair & cozy room' },
  { id: 'full-body', label: 'Full Body', desc: 'Complete seated figure, chair & full room' },
];

export const WardrobeScreen: React.FC<WardrobeScreenProps> = ({
  config,
  roomConfig = DEFAULT_ROOM_CONFIG,
  draftAvatar: controlledAvatar,
  draftRoom: controlledRoom,
  onDraftChange,
  progress,
  glbInspection,
  previewEmotion = null,
  activeCameraPreset = 'close-up',
  onSelectPreviewEmotion,
  onChangeCameraPreset,
  onResetCamera,
  onPreviewOnStage,
  onApplyWardrobe,
  onNavigatePlay,
}) => {
  const [sectionTab, setSectionTab] = useState<'appearance' | 'camera-expressions' | 'room'>(
    'appearance'
  );
  const [localAvatar, setLocalAvatar] = useState<AvatarAppearanceConfig>(config);
  const [localRoom, setLocalRoom] = useState<RoomConfig>(roomConfig);

  const draftAvatar = controlledAvatar ?? localAvatar;
  const draftRoom = controlledRoom ?? localRoom;

  const updateDraft = (nextAvatar: AvatarAppearanceConfig, nextRoom: RoomConfig) => {
    if (onDraftChange) {
      onDraftChange(nextAvatar, nextRoom);
    } else {
      setLocalAvatar(nextAvatar);
      setLocalRoom(nextRoom);
    }
  };

  const hasChanges =
    JSON.stringify(draftAvatar) !== JSON.stringify(config) ||
    JSON.stringify(draftRoom) !== JSON.stringify(roomConfig);

  const handleApply = () => {
    onApplyWardrobe(draftAvatar, draftRoom);
  };

  const handleDiscard = () => {
    updateDraft(config, roomConfig);
  };

  const handleReset = () => {
    const resetAvatar: AvatarAppearanceConfig = {
      ...DEFAULT_AVATAR_CONFIG,
      customImagePath: config.customImagePath || '/avatars/atmiya.png',
    };
    const resetRoom: RoomConfig = { ...DEFAULT_ROOM_CONFIG };
    updateDraft(resetAvatar, resetRoom);
    onSelectPreviewEmotion?.(null);
    onResetCamera?.();
    onApplyWardrobe(resetAvatar, resetRoom);
  };

  const activeType = draftAvatar.avatarType || '3d-glb';
  const defaultCamera = draftAvatar.defaultCameraPreset || activeCameraPreset || 'upper-body';

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 dark:bg-gradient-to-b dark:from-[#070d1a] dark:via-[#0b162d] dark:to-[#070d1a] px-4 sm:px-6 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-500/35 text-blue-600 dark:text-sky-300 flex items-center justify-center shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Customize Ātmiya
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Avatar appearance, camera framing, expressions, and room atmosphere.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasChanges && (
              <button
                type="button"
                onClick={handleDiscard}
                className="h-10 px-3.5 rounded-xl bg-white dark:bg-[#0c1528] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="h-10 px-4 rounded-xl bg-white dark:bg-[#0c1528] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={!hasChanges}
              className={`h-10 px-5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:cursor-default ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{hasChanges ? 'Apply Changes' : 'Applied'}</span>
            </button>
          </div>
        </header>

        {/* Unsaved Indicator Banner */}
        {hasChanges && (
          <div
            role="status"
            className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-500/35 text-xs text-blue-800 dark:text-sky-200 flex flex-wrap items-center justify-between gap-2"
          >
            <span>You have unapplied customization changes in your preview.</span>
            <span className="font-semibold">Click Apply Changes to keep them.</span>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Customization groups">
          {[
            { id: 'appearance' as const, label: 'Appearance & Style', icon: Palette },
            { id: 'camera-expressions' as const, label: 'Camera & Expressions', icon: Camera },
            { id: 'room' as const, label: 'Room & Progress', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = sectionTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSectionTab(tab.id)}
                className={`h-10 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#0c162b] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Live Stage Preview & Asset Info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl bg-white dark:bg-[#0c1528]">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#081020] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-700 dark:text-sky-300">
                  Live Stage Preview
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {hasChanges ? 'Draft preview' : 'Saved look'}
                </span>
              </div>
              <div className="h-72 relative">
                <CompanionRoom roomConfig={draftRoom} avatarState="idle" prefersReducedMotion>
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <CompanionAvatar
                      stageVariant="immersive"
                      state="idle"
                      emotion={previewEmotion ?? 'smile'}
                      config={draftAvatar}
                      compactPreview
                    />
                    <div className="mt-2 px-3 py-1 rounded-xl bg-white/90 dark:bg-[#091224]/85 border border-slate-200 dark:border-slate-700/70 text-[11px] text-slate-900 dark:text-slate-100 font-medium backdrop-blur-md text-center">
                      {draftAvatar.personaName || 'Ātmiya'} · {draftAvatar.outfitStyleLabel || 'Navy Classic'} ·{' '}
                      {CAMERA_PRESET_OPTIONS.find((p) => p.id === defaultCamera)?.label}
                    </div>
                  </div>
                </CompanionRoom>
              </div>
              {onPreviewOnStage && (
                <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-[#081020]/70 text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {previewEmotion
                      ? `Expression: ${AVATAR_EMOTION_LABELS[previewEmotion]}`
                      : '3D GLB renders on Companion stage'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeCameraPreset?.(defaultCamera);
                      onPreviewOnStage();
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-sky-300 hover:underline cursor-pointer"
                  >
                    View on Stage
                  </button>
                </div>
              )}
            </div>

            {/* Scope Disclosure */}
            <div className="rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
              <div className="font-semibold text-blue-700 dark:text-sky-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 shrink-0" />
                <span>About Visual Customization</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Room themes, camera framing, expressions, outfit trims, and 2D portrait badges are persisted locally. Theme colors do not modify the <code className="text-blue-700 dark:text-sky-300">.glb</code> 3D mesh geometry.
              </p>
            </div>

            {/* Live GLB Inspection Summary */}
            {glbInspection && (
              <div className="rounded-2xl bg-white dark:bg-[#0c1528] border border-emerald-200 dark:border-emerald-500/30 p-4 text-xs space-y-2">
                <div className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Loaded 3D Asset ({glbInspection.modelUrl})</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                  Meshes: {glbInspection.meshes.length} · Bones: {glbInspection.bones.length} · Morphs: {glbInspection.morphTargets.length}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Active Customization Group */}
          <div className="lg:col-span-7 space-y-5">
            {sectionTab === 'appearance' && (
              <section className="rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800 p-5 space-y-5 shadow-xs">
                {/* Display Name & Renderer Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="companion-name-input"
                      className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5"
                    >
                      Companion Display Name
                    </label>
                    <input
                      id="companion-name-input"
                      type="text"
                      value={draftAvatar.personaName}
                      onChange={(e) =>
                        updateDraft({ ...draftAvatar, personaName: e.target.value }, draftRoom)
                      }
                      placeholder="Ātmiya"
                      className="w-full h-10 bg-slate-50 dark:bg-[#081020] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Avatar Renderer Mode
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft(
                            {
                              ...draftAvatar,
                              avatarType: '3d-glb',
                              threeWsMigrated: true,
                              localGlbMigrated: true,
                              glbModelPath: draftAvatar.glbModelPath || '/models/atmiya-avatar.glb',
                            },
                            draftRoom
                          )
                        }
                        className={`h-10 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                          activeType === '3d-glb'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Box className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300 shrink-0" />
                        <span className="truncate">Local GLB</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft(
                            {
                              ...draftAvatar,
                              avatarType: 'three-ws',
                              threeWsMigrated: true,
                              localGlbMigrated: true,
                            },
                            draftRoom
                          )
                        }
                        className={`h-10 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                          activeType === 'three-ws'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Box className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300 shrink-0" />
                        <span className="truncate">three.ws</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft(
                            {
                              ...draftAvatar,
                              avatarType: 'custom-image',
                              threeWsMigrated: true,
                              localGlbMigrated: true,
                              customImagePath: draftAvatar.customImagePath || '/avatars/atmiya.png',
                            },
                            draftRoom
                          )
                        }
                        className={`h-10 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition ${
                          activeType === 'custom-image'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300 shrink-0" />
                        <span className="truncate">2D Portrait</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Outfit Palette Accent */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Outfit Frame & Theme Palette
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Updates portrait rim trim and ambient lighting accent.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {OUTFIT_PALETTES.map((item) => {
                      const isSelected = (draftAvatar.outfitColor || '#1e3a5f') === item.color;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() =>
                            updateDraft(
                              {
                                ...draftAvatar,
                                outfitColor: item.color,
                                outfitStyleLabel: item.label,
                                accentColor: item.color,
                              },
                              draftRoom
                            )
                          }
                          className={`h-10 px-3.5 rounded-xl border text-xs font-medium inline-flex items-center gap-2 transition cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-white'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/30"
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Portrait Overlay Accessories */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Portrait Overlay Accessories
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Optional decorative badges displayed on the 2D companion portrait frame.
                  </p>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ACCESSORIES.map((acc) => {
                      const isSelected = (draftAvatar.accessory || 'none') === acc.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() =>
                            updateDraft({ ...draftAvatar, accessory: acc.id }, draftRoom)
                          }
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-white'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-semibold">{acc.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {acc.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {sectionTab === 'camera-expressions' && (
              <div className="space-y-5">
                {/* Camera Framing Settings */}
                <section className="rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-blue-600 dark:text-sky-300" />
                        <span>Camera Framing Preset</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Sets your preferred default framing for the 3D companion stage.
                      </p>
                    </div>
                    {onResetCamera && (
                      <button
                        type="button"
                        onClick={() => {
                          updateDraft(
                            { ...draftAvatar, defaultCameraPreset: 'upper-body' },
                            draftRoom
                          );
                          onChangeCameraPreset?.('upper-body');
                        }}
                        className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-[#081020] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset to Upper Body</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {CAMERA_PRESET_OPTIONS.map((preset) => {
                      const isSelected = defaultCamera === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            onChangeCameraPreset?.(preset.id);
                            updateDraft(
                              { ...draftAvatar, defaultCameraPreset: preset.id },
                              draftRoom
                            );
                          }}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-slate-900 dark:text-white'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs font-semibold flex items-center justify-between">
                            <span>{preset.label}</span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {preset.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Expression Preview Grid */}
                <section className="rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Smile className="w-4 h-4 text-blue-600 dark:text-sky-300" />
                        <span>Expression Preview</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Test facial expressions on the preview and Companion stage.
                      </p>
                    </div>
                    {previewEmotion && onSelectPreviewEmotion && (
                      <button
                        type="button"
                        onClick={() => onSelectPreviewEmotion(null)}
                        className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-[#081020] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Clear Preview
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AVATAR_EMOTIONS.map((expr) => {
                      const isActive = previewEmotion === expr;
                      const isSupported =
                        !glbInspection || Boolean(glbInspection.supportedExpressions[expr]);
                      return (
                        <button
                          key={expr}
                          type="button"
                          disabled={!isSupported}
                          onClick={() => onSelectPreviewEmotion?.(isActive ? null : expr)}
                          className={`px-3 py-2 rounded-xl border text-left text-xs transition ${
                            !isSupported
                              ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#081020]/50 text-slate-400 cursor-not-allowed opacity-70'
                              : isActive
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-white font-semibold cursor-pointer'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700 cursor-pointer'
                          }`}
                        >
                          <span className="truncate block">{AVATAR_EMOTION_LABELS[expr]}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {sectionTab === 'room' && (
              <section className="rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Room Backgrounds</h2>
                  <span className="text-[11px] text-blue-700 dark:text-sky-300 font-semibold tabular-nums">
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
                          updateDraft(draftAvatar, {
                            environment: room.id,
                            lightingMood: room.lightingMood,
                          })
                        }
                        className={`p-3.5 rounded-xl border text-left transition ${
                          !isUnlocked
                            ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#081020]/60 text-slate-400 cursor-not-allowed opacity-75'
                            : isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-slate-900 dark:text-white cursor-pointer'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-800 dark:text-slate-200 hover:border-blue-300 dark:hover:border-slate-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 font-semibold text-xs">
                          <span className="flex items-center gap-1.5">
                            <Icon className="w-4 h-4 text-amber-500 dark:text-amber-300 shrink-0" />
                            {room.title}
                          </span>
                          {!isUnlocked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 tabular-nums">
                              <Lock className="w-3 h-3" />
                              {room.requiredXp} XP
                            </span>
                          ) : isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          {room.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {progress.unlockedRoomIds.length < ROOM_OPTIONS.length && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <span>Play mini-games to earn XP and unlock remaining rooms.</span>
                    <button
                      type="button"
                      onClick={onNavigatePlay}
                      className="text-blue-600 dark:text-sky-300 hover:underline font-semibold cursor-pointer"
                    >
                      Go to Play Hub
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        {/* Companion Progress (Visible in Room & Progress tab or below on wide view) */}
        {sectionTab === 'room' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <section className="rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500 dark:text-amber-300" />
                <span>Unlocked Achievements ({progress.achievements.length})</span>
              </h2>
              {progress.achievements.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                  Play any mini-game or tap Wave/Cheer on Companion Home to earn your first badge.
                </p>
              ) : (
                <div className="space-y-2">
                  {progress.achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#081020] border border-amber-200 dark:border-amber-400/20 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-amber-100">
                          {ach.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {ach.description}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                        {new Date(ach.unlockedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-sky-300" />
                <span>Recent Companion Activity</span>
              </h2>
              {progress.interactionHistory.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                  Your recent mini-game finishes and playful interactions will appear here.
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {progress.interactionHistory.slice(0, 8).map((entry) => (
                    <div
                      key={entry.id}
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081020] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-700 dark:text-slate-200 truncate">
                        {entry.label}
                      </span>
                      <span className="text-blue-700 dark:text-sky-300 font-semibold tabular-nums shrink-0">
                        +{entry.xpEarned} XP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
