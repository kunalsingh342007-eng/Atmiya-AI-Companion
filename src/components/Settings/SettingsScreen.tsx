import React, { useEffect, useState } from 'react';
import {
  AvatarAppearanceConfig,
  AvatarEmotion,
  CameraFramingPreset,
  CompanionLanguage,
  CompanionPersonality,
  CompanionSettings,
  GameProgress,
  RoomConfig,
  SystemStatus,
  UserProfile,
} from '../../types/companion';
import { DEFAULT_SETTINGS, storage } from '../../services/storage';
import { PageHeading, SubpageBackdrop } from '../Layout/CompanionPagePrimitives';
import { ProfileAvatar } from '../Profile/ProfileAvatar';
import { isValidProfileImageUrl, processProfileImageFile } from '../../utils/profileImage';
import { WardrobeScreen } from '../Wardrobe/WardrobeScreen';
import type { GlbInspectionReport } from '../Avatar/RealisticAvatar';
import {
  AlertTriangle,
  Check,
  Download,
  Globe,
  HardDrive,
  Info,
  Mic,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Smile,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User,
  Volume2,
} from 'lucide-react';

export type SettingsSectionId = 'profile' | 'appearance' | 'voice' | 'privacy' | 'about';

interface SettingsScreenProps {
  settings: CompanionSettings;
  profile: UserProfile;
  conversationsCount: number;
  systemStatus: SystemStatus;
  onSaveSettings: (settings: CompanionSettings, toastText?: string) => void;
  onSaveProfile: (profile: UserProfile, toastText?: string) => boolean;
  onDataRestored?: () => void;
  onClearAllConversations: () => void;
  onRevisitOnboarding?: () => void;
  isApiKeyConfigured: boolean;
  // Embedded 3D stage & room customizer props (under Appearance)
  progress: GameProgress;
  glbInspection?: GlbInspectionReport | null;
  previewEmotion?: AvatarEmotion | null;
  activeCameraPreset?: CameraFramingPreset;
  draftAvatar?: AvatarAppearanceConfig;
  draftRoom?: RoomConfig;
  onDraftWardrobeChange?: (avatar: AvatarAppearanceConfig, room: RoomConfig) => void;
  onSelectPreviewEmotion?: (emotion: AvatarEmotion | null) => void;
  onChangeCameraPreset?: (preset: CameraFramingPreset) => void;
  onResetCamera?: () => void;
  onPreviewOnStage?: () => void;
  onApplyWardrobe: (newAvatar: AvatarAppearanceConfig, newRoom: RoomConfig) => void;
  onNavigatePlay: () => void;
  requestedSection?: {
    section: SettingsSectionId;
    openCustomizer?: boolean;
    nonce: number;
  } | null;
}

const SECTIONS: {
  id: SettingsSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'voice', label: 'Language & Voice', icon: Volume2 },
  { id: 'privacy', label: 'Privacy & Data', icon: ShieldCheck },
  { id: 'about', label: 'About', icon: Info },
];

const LANGUAGES: { id: CompanionLanguage; label: string }[] = [
  { id: 'auto', label: 'Auto-detect (स्वतः)' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी (Hindi)' },
  { id: 'hinglish', label: 'Hinglish (हिंग्लिश)' },
];

const PERSONALITIES: { id: CompanionPersonality; title: string; subtitle: string }[] = [
  { id: 'calm', title: 'Calm & Gentle (शांत और सौम्य)', subtitle: 'Warm, reassuring, empathetic listener' },
  { id: 'friendly', title: 'Friendly & Playful (दोस्ताना)', subtitle: 'Witty, vibrant, upbeat companion' },
  { id: 'reflective', title: 'Thoughtful & Reflective', subtitle: 'Philosophical, curious, deep thinker' },
  { id: 'study', title: 'Study & Code Partner', subtitle: 'Patient tutor for STEM & problem solving' },
  { id: 'creative', title: 'Creative Brainstormer', subtitle: 'Inventive, lateral thinking collaborator' },
];

const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore', tone: 'Calm, soothing presence' },
  { id: 'Puck', label: 'Puck', tone: 'Warm, energetic' },
  { id: 'Fenrir', label: 'Fenrir', tone: 'Deep, grounding voice' },
  { id: 'Zephyr', label: 'Zephyr', tone: 'Airy, gentle cadence' },
  { id: 'Charon', label: 'Charon', tone: 'Mature, steady tone' },
];

const APPEARANCE_PRESETS = [
  { id: 'navy-classic', label: 'Navy Classic', outfitColor: '#1e3a5f' },
  { id: 'ocean-blue', label: 'Ocean Blue', outfitColor: '#2563eb' },
  { id: 'deep-indigo', label: 'Deep Indigo', outfitColor: '#4f46e5' },
  { id: 'coral-dawn', label: 'Coral Dawn', outfitColor: '#e11d48' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  profile,
  conversationsCount,
  systemStatus,
  onSaveSettings,
  onSaveProfile,
  onDataRestored,
  onClearAllConversations,
  onRevisitOnboarding,
  isApiKeyConfigured,
  progress,
  glbInspection,
  previewEmotion = null,
  activeCameraPreset = 'close-up',
  draftAvatar,
  draftRoom,
  onDraftWardrobeChange,
  onSelectPreviewEmotion,
  onChangeCameraPreset,
  onResetCamera,
  onPreviewOnStage,
  onApplyWardrobe,
  onNavigatePlay,
  requestedSection,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(
    requestedSection?.section ?? 'profile'
  );
  const [showStageCustomizer, setShowStageCustomizer] = useState<boolean>(
    Boolean(requestedSection?.openCustomizer)
  );
  const [draftSettings, setDraftSettings] = useState<CompanionSettings>(settings);

  // Profile draft
  const [draftName, setDraftName] = useState(profile.displayName || settings.userName || '');
  const [draftBio, setDraftBio] = useState(profile.bio || '');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState<string | undefined>(profile.avatarDataUrl);
  const [imageUrlInput, setImageUrlInput] = useState(
    profile.avatarDataUrl && !profile.avatarDataUrl.startsWith('data:')
      ? profile.avatarDataUrl
      : ''
  );
  const [imageError, setImageError] = useState<string | null>(null);

  const [micPermissionState, setMicPermissionState] = useState<string>('checking');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);
  const [exportNotice, setExportNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (requestedSection) {
      setActiveSection(requestedSection.section);
      setShowStageCustomizer(Boolean(requestedSection.openCustomizer));
    }
  }, [requestedSection]);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    setDraftName(profile.displayName || settings.userName || '');
    setDraftBio(profile.bio || '');
    setDraftAvatarUrl(profile.avatarDataUrl);
    setImageUrlInput(
      profile.avatarDataUrl && !profile.avatarDataUrl.startsWith('data:')
        ? profile.avatarDataUrl
        : ''
    );
  }, [profile, settings.userName]);

  useEffect(() => {
    let mounted = true;
    let permObj: PermissionStatus | null = null;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          if (!mounted) return;
          permObj = status;
          setMicPermissionState(status.state);
          status.onchange = () => {
            if (mounted) setMicPermissionState(status.state);
          };
        })
        .catch(() => {
          if (mounted) setMicPermissionState('prompt');
        });
    } else {
      setMicPermissionState('unknown');
    }
    return () => {
      mounted = false;
      if (permObj) {
        permObj.onchange = null;
      }
    };
  }, []);

  const hasUnsavedSettings = JSON.stringify(draftSettings) !== JSON.stringify(settings);
  const hasUnsavedProfile =
    draftName.trim() !== (profile.displayName || '').trim() ||
    draftBio.trim() !== (profile.bio || '').trim() ||
    (draftAvatarUrl || '') !== (profile.avatarDataUrl || '');

  const voiceOutputActive =
    draftSettings.voiceEngine !== 'none' && draftSettings.autoSpeakResponse;
  const expressionsActive = draftSettings.expressionsEnabled !== false;
  const browserSpeechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const updateDraft = (updates: Partial<CompanionSettings>) => {
    setDraftSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleSaveProfileClick = () => {
    const cleanName = draftName.trim();
    const ok = onSaveProfile(
      {
        ...profile,
        displayName: cleanName,
        bio: draftBio.trim(),
        avatarDataUrl: draftAvatarUrl || undefined,
        onboardingCompleted: true,
      },
      'Profile updated'
    );
    if (ok && cleanName !== settings.userName) {
      onSaveSettings({ ...draftSettings, userName: cleanName }, 'Profile & name saved');
    }
  };

  const handleUploadAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageError(null);
    const result = await processProfileImageFile(file);
    if (result.error) {
      setImageError(result.error);
      return;
    }
    if (result.dataUrl) {
      setDraftAvatarUrl(result.dataUrl);
      setImageUrlInput('');
    }
  };

  const handleApplyAvatarUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) {
      setDraftAvatarUrl(undefined);
      setImageError(null);
      return;
    }
    if (!isValidProfileImageUrl(trimmed)) {
      setImageError('Please enter a valid http(s) image URL.');
      return;
    }
    setImageError(null);
    setDraftAvatarUrl(trimmed);
  };

  const handleSaveSettingsClick = () => {
    onSaveSettings(draftSettings, 'Settings saved');
  };

  const handleConfirmReset = () => {
    const resetTarget: CompanionSettings = {
      ...DEFAULT_SETTINGS,
      userName: profile.displayName || draftName.trim(),
    };
    setDraftSettings(resetTarget);
    setShowResetConfirm(false);
    onSaveSettings(resetTarget, 'Settings reset to default');
  };

  const handleExport = () => {
    const jsonStr = storage.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atmiya_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice({
      type: 'success',
      text: 'Backup exported to a local JSON file.',
    });
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storage.importData(content);
      input.value = '';
      if (success) {
        setExportNotice({ type: 'success', text: 'Backup restored successfully.' });
        setDraftSettings(storage.getSettings());
        if (onDataRestored) {
          onDataRestored();
        } else {
          onSaveSettings(storage.getSettings(), 'Backup restored');
        }
        setTimeout(() => setExportNotice(null), 3500);
      } else {
        setExportNotice({
          type: 'error',
          text: 'Could not import: invalid backup JSON file.',
        });
      }
    };
    reader.onerror = () => {
      input.value = '';
      setExportNotice({
        type: 'error',
        text: 'Could not read the selected file.',
      });
    };
    reader.readAsText(file);
  };

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

  return (
    <SubpageBackdrop>
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeading
            title="Profile & Settings"
            subtitle="Manage your profile, appearance, voice, privacy, and app details"
          />
          {(hasUnsavedSettings || hasUnsavedProfile) && (
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
              Unsaved changes
            </span>
          )}
        </div>

        {/* Section Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Section Nav */}
          <nav
            aria-label="Settings sections"
            className="md:col-span-4 lg:col-span-3 flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0"
          >
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const active = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(sec.id);
                    if (sec.id !== 'appearance') {
                      setShowStageCustomizer(false);
                    }
                  }}
                  aria-current={active ? 'location' : undefined}
                  className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium inline-flex items-center gap-2.5 transition cursor-pointer whitespace-nowrap shrink-0 border ${
                    active
                      ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                      : 'bg-[var(--bg-surface)] dark:bg-[#0b132b] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Active Section Card */}
          <div className="md:col-span-8 lg:col-span-9 rounded-2xl bg-[var(--bg-surface)] dark:bg-[#0b132b] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
            {activeSection === 'profile' && (
              <section aria-label="Profile settings" className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Profile</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Personalizes greetings and how Ātmiya addresses you locally.
                    </p>
                  </div>
                  {onRevisitOnboarding && (
                    <button
                      type="button"
                      onClick={onRevisitOnboarding}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer"
                    >
                      Revisit Welcome Setup
                    </button>
                  )}
                </div>

                {/* Photo Upload & Preview */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-800">
                  <ProfileAvatar
                    displayName={draftName || 'You'}
                    avatarDataUrl={draftAvatarUrl}
                    size="xl"
                  />
                  <div className="flex-1 w-full space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={handleUploadAvatarFile}
                          className="sr-only"
                        />
                      </label>
                      {draftAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setDraftAvatarUrl(undefined);
                            setImageUrlInput('');
                            setImageError(null);
                          }}
                          className="h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-rose-600 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="Or paste an https:// image URL"
                        aria-label="Profile image URL"
                        className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-white dark:bg-[#0b132b] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleApplyAvatarUrl}
                        className="h-8 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {imageError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400" role="alert">
                        {imageError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="settings-display-name"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      Display Name
                    </label>
                    <input
                      id="settings-display-name"
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      maxLength={80}
                      placeholder="What should Ātmiya call you?"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="settings-profile-bio"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      Short Personal Intro
                    </label>
                    <textarea
                      id="settings-profile-bio"
                      value={draftBio}
                      onChange={(e) => setDraftBio(e.target.value)}
                      maxLength={240}
                      rows={3}
                      placeholder="Optional note about yourself (e.g., interests, study focus)"
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveProfileClick}
                    className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Profile</span>
                  </button>
                </div>
              </section>
            )}

            {activeSection === 'appearance' && (
              <section aria-label="Appearance settings" className="space-y-5">
                {showStageCustomizer ? (
                  <WardrobeScreen
                    embedded
                    onBackToAppearance={() => setShowStageCustomizer(false)}
                    config={settings.avatarConfig}
                    roomConfig={settings.roomConfig}
                    draftAvatar={draftAvatar}
                    draftRoom={draftRoom}
                    onDraftChange={onDraftWardrobeChange}
                    progress={progress}
                    glbInspection={glbInspection}
                    previewEmotion={previewEmotion}
                    activeCameraPreset={activeCameraPreset}
                    onSelectPreviewEmotion={onSelectPreviewEmotion}
                    onChangeCameraPreset={onChangeCameraPreset}
                    onResetCamera={onResetCamera}
                    onPreviewOnStage={onPreviewOnStage}
                    onApplyWardrobe={onApplyWardrobe}
                    onNavigatePlay={onNavigatePlay}
                  />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Appearance
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Switch between Light and Dark / Night themes and customize Ātmiya&apos;s stage.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowStageCustomizer(true)}
                        className="h-9 px-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 border border-indigo-200 dark:border-indigo-500/35 text-xs font-semibold text-indigo-700 dark:text-indigo-200 cursor-pointer transition"
                      >
                        Customize 3D Stage &amp; Rooms →
                      </button>
                    </div>

                    {/* Theme Mode */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                        App Theme
                      </span>
                      <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Theme mode">
                        {[
                          { id: 'light' as const, label: 'Light', icon: Sun },
                          { id: 'dark' as const, label: 'Dark / Night', icon: Moon },
                          { id: 'auto' as const, label: 'System', icon: Sparkles },
                        ].map((t) => {
                          const Icon = t.icon;
                          const active = draftSettings.theme === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => {
                                const next = { ...draftSettings, theme: t.id };
                                setDraftSettings(next);
                                onSaveSettings(
                                  next,
                                  t.id === 'auto'
                                    ? 'Theme set to follow system'
                                    : `Switched to ${t.label} theme`
                                );
                              }}
                              className={`h-10 px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                active
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : 'bg-slate-50 dark:bg-[#081024] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Facial Expressions */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Smile className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                            Avatar Facial Expressions
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Express emotion and natural head gestures during replies
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={expressionsActive}
                        aria-label="Toggle facial expressions"
                        onClick={() => updateDraft({ expressionsEnabled: !expressionsActive })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                          expressionsActive ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                            expressionsActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Companion Trim Accent */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                        Companion Accent Trim
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {APPEARANCE_PRESETS.map((preset) => {
                          const active =
                            (draftSettings.avatarConfig.outfitColor || '#1e3a5f') ===
                            preset.outfitColor;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() =>
                                updateDraft({
                                  avatarConfig: {
                                    ...draftSettings.avatarConfig,
                                    outfitColor: preset.outfitColor,
                                    outfitStyleLabel: preset.label,
                                    accentColor: preset.outfitColor,
                                  },
                                })
                              }
                              className={`h-10 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-2 transition cursor-pointer ${
                                active
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-white'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081024] text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15 dark:border-white/25"
                                style={{ backgroundColor: preset.outfitColor }}
                              />
                              <span className="truncate">{preset.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSaveSettingsClick}
                        disabled={!hasUnsavedSettings}
                        className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:cursor-default"
                      >
                        <Check className="w-4 h-4" />
                        <span>{hasUnsavedSettings ? 'Save Changes' : 'Saved'}</span>
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}

            {activeSection === 'voice' && (
              <section aria-label="Language and Voice settings" className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Language &amp; Voice
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure conversation language, companion tone, and spoken replies.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="settings-lang-select"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
                      <span>Language</span>
                    </label>
                    <select
                      id="settings-lang-select"
                      value={draftSettings.language}
                      onChange={(e) =>
                        updateDraft({ language: e.target.value as CompanionLanguage })
                      }
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white cursor-pointer"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="settings-rate-range"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between"
                    >
                      <span>Speech Rate</span>
                      <span className="tabular-nums text-indigo-600 dark:text-indigo-300">
                        {draftSettings.speechRate.toFixed(1)}x
                      </span>
                    </label>
                    <input
                      id="settings-rate-range"
                      type="range"
                      min={0.8}
                      max={1.3}
                      step={0.1}
                      value={draftSettings.speechRate}
                      onChange={(e) =>
                        updateDraft({ speechRate: parseFloat(e.target.value) })
                      }
                      className="w-full accent-indigo-600 h-10 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Voice Output Engine */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Speech Output Engine
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={voiceOutputActive}
                      aria-label="Auto-speak responses"
                      onClick={() =>
                        updateDraft({
                          autoSpeakResponse: !voiceOutputActive,
                          voiceEngine:
                            !voiceOutputActive && draftSettings.voiceEngine === 'none'
                              ? 'gemini-native'
                              : draftSettings.voiceEngine,
                        })
                      }
                      className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <span>{voiceOutputActive ? 'Auto-speak On' : 'Auto-speak Off'}</span>
                      <span
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          voiceOutputActive ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            voiceOutputActive ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                        />
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'gemini-native' as const, label: 'Gemini TTS' },
                      { id: 'browser-tts' as const, label: 'Browser TTS' },
                      { id: 'none' as const, label: 'Silent / Text' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          updateDraft({
                            voiceEngine: mode.id,
                            autoSpeakResponse: mode.id !== 'none',
                          })
                        }
                        className={`h-9 px-2 rounded-xl border text-xs font-medium cursor-pointer transition ${
                          draftSettings.voiceEngine === mode.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081024] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {draftSettings.voiceEngine === 'gemini-native' && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                        Voice Preset
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {GEMINI_VOICES.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => updateDraft({ selectedVoice: v.id })}
                            title={v.tone}
                            className={`h-8 px-3 rounded-lg border text-xs font-medium cursor-pointer transition ${
                              draftSettings.selectedVoice === v.id
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-white'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081024] text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                      {!isApiKeyConfigured && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          Gemini server API key is not configured. Audio output will fall back to browser speech when supported.
                        </p>
                      )}
                    </div>
                  )}

                  {draftSettings.voiceEngine === 'browser-tts' && !browserSpeechSupported && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Browser speech synthesis is not supported on this device/browser.
                    </p>
                  )}
                </div>

                {/* Hands-Free + Mic Status */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                        Hands-Free Voice Flow
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Automatically start listening after Ātmiya finishes speaking
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftSettings.handsFreeMode}
                      onChange={(e) => updateDraft({ handsFreeMode: e.target.checked })}
                      className="accent-indigo-600 w-4 h-4 shrink-0"
                    />
                  </label>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
                      Microphone Permission
                    </span>
                    <span className="font-semibold uppercase text-[11px] text-slate-700 dark:text-slate-200">
                      {micPermissionState}
                    </span>
                  </div>
                </div>

                {/* Companion Tone / Personality */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                    Companion Personality
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PERSONALITIES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => updateDraft({ personality: p.id })}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          draftSettings.personality === p.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081024]'
                        }`}
                      >
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {p.subtitle}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveSettingsClick}
                    disabled={!hasUnsavedSettings}
                    className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:cursor-default"
                  >
                    <Check className="w-4 h-4" />
                    <span>{hasUnsavedSettings ? 'Save Changes' : 'Saved'}</span>
                  </button>
                </div>
              </section>
            )}

            {activeSection === 'privacy' && (
              <section aria-label="Privacy and Data settings" className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Privacy &amp; Data
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage conversations, preferences, and backups stored locally in this browser.
                  </p>
                </div>

                {/* Local Data Notice */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white mb-0.5">
                      Local Browser Storage
                    </p>
                    <p>
                      Your profile, preferences, and conversation transcripts are stored locally on this device in <code className="text-indigo-600 dark:text-indigo-300">localStorage</code>. They are not synced across external cloud accounts.
                    </p>
                  </div>
                </div>

                {/* Backup & Restore */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Local Backup &amp; Restore (JSON)
                  </div>
                  {exportNotice && (
                    <div
                      role="status"
                      className={`p-2.5 rounded-lg text-xs ${
                        exportNotice.type === 'error'
                          ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200'
                          : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200'
                      }`}
                    >
                      {exportNotice.text}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleExport}
                      className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Data</span>
                    </button>
                    <label className="h-9 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Restore JSON</span>
                      <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Clear Data Controls */}
                <div className="space-y-2.5 pt-1">
                  {!showClearChatsConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowClearChatsConfirm(true)}
                      className="w-full h-10 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/45 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-500/35 text-xs font-semibold text-rose-700 dark:text-rose-200 flex items-center justify-between cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Conversation History</span>
                      </span>
                      <span className="tabular-nums opacity-75">{conversationsCount} sessions</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900 dark:text-rose-100">
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-300" />
                        Delete all local conversation history?
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClearAllConversations();
                            setShowClearChatsConfirm(false);
                          }}
                          className="h-8 px-3 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowClearChatsConfirm(false)}
                          className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeSection === 'about' && (
              <section aria-label="About Ātmiya" className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    About Ātmiya AI Companion
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Application details and active runtime configuration.
                  </p>
                </div>

                <dl className="rounded-2xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Product Name</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      Ātmiya AI Companion
                    </dd>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Version</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      v{appVersion}
                    </dd>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Data Persistence</dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-200">
                      Local browser storage (single-device)
                    </dd>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Server AI Status</dt>
                    <dd
                      className={`font-semibold ${
                        isApiKeyConfigured
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-300'
                      }`}
                    >
                      {isApiKeyConfigured ? 'Connected' : 'API Key Not Configured'}
                    </dd>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Chat / Voice Models</dt>
                    <dd className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {systemStatus.model} · {systemStatus.ttsModel}
                    </dd>
                  </div>
                </dl>

                {/* Reset Preferences */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  {!showResetConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="h-9 px-4 rounded-xl bg-slate-100 dark:bg-[#081024] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Preferences to Default</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/35 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-amber-900 dark:text-amber-100 font-medium">
                        Reset theme, language, and voice settings to defaults?
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={handleConfirmReset}
                          className="h-8 px-3 rounded-lg bg-amber-600 text-white font-semibold cursor-pointer"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(false)}
                          className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </SubpageBackdrop>
  );
};
