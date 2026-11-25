import React, { useEffect, useState } from 'react';
import {
  CompanionLanguage,
  CompanionPersonality,
  CompanionSettings,
} from '../../types/companion';
import { DEFAULT_SETTINGS, storage } from '../../services/storage';
import { PageHeading, SubpageBackdrop } from '../Layout/CompanionPagePrimitives';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Globe,
  HardDrive,
  Mic,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Smile,
  Sun,
  Trash2,
  Upload,
  User,
  Volume2,
} from 'lucide-react';

interface SettingsScreenProps {
  settings: CompanionSettings;
  onSaveSettings: (settings: CompanionSettings, toastText?: string) => void;
  onDataRestored?: () => void;
  onClearAllConversations: () => void;
  onOpenCustomize?: () => void;
  isApiKeyConfigured: boolean;
}

const LANGUAGES: { id: CompanionLanguage; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'auto', label: 'Auto-detect (स्वतः)' },
  { id: 'hi', label: 'हिन्दी (Hindi)' },
  { id: 'hinglish', label: 'Hinglish (हिंग्लिश)' },
];

// Real supported outfit trim / accent presets shared with WardrobeScreen
const APPEARANCE_THUMBNAILS: {
  id: string;
  label: string;
  outfitColor: string;
  bgGradient: string;
  collarColor: string;
}[] = [
  {
    id: 'navy-classic',
    label: 'Navy Classic',
    outfitColor: '#1e3a5f',
    bgGradient: 'from-[#1e293b] to-[#0f172a]',
    collarColor: '#38bdf8',
  },
  {
    id: 'ocean-blue',
    label: 'Ocean Blue',
    outfitColor: '#2563eb',
    bgGradient: 'from-[#1d4ed8]/60 to-[#0f172a]',
    collarColor: '#60a5fa',
  },
  {
    id: 'deep-indigo',
    label: 'Deep Indigo',
    outfitColor: '#4f46e5',
    bgGradient: 'from-[#4338ca]/60 to-[#1e1b4b]',
    collarColor: '#a78bfa',
  },
  {
    id: 'coral-dawn',
    label: 'Coral Dawn',
    outfitColor: '#e11d48',
    bgGradient: 'from-[#be123c]/55 to-[#1e1b4b]',
    collarColor: '#fb7185',
  },
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

const AppearanceBustThumb: React.FC<{
  bgGradient: string;
  outfitColor: string;
  collarColor: string;
}> = ({ bgGradient, outfitColor, collarColor }) => (
  <div
    className={`w-full h-14 rounded-lg bg-gradient-to-b ${bgGradient} flex items-end justify-center overflow-hidden relative`}
  >
    <svg viewBox="0 0 64 64" className="w-12 h-12" aria-hidden="true">
      {/* Hair back */}
      <path d="M18 22 C16 34 15 44 19 48 L45 48 C49 44 48 34 46 22 Z" fill="#4a2c22" />
      {/* Shoulders & outfit */}
      <path d="M12 64 C13 49 20 44 32 44 C44 44 51 49 52 64 Z" fill={outfitColor} />
      <path d="M21 48 L32 52 L43 48" fill="none" stroke={collarColor} strokeWidth="2.4" strokeLinecap="round" />
      {/* Neck & face */}
      <rect x="28" y="37" width="8" height="8" rx="3" fill="#f3c5a2" />
      <circle cx="32" cy="27" r="11" fill="#f5cbb0" />
      {/* Bangs */}
      <path d="M20 25 C21 15 43 15 44 25 C40 20 24 20 20 25 Z" fill="#4a2c22" />
      {/* Eyes */}
      <circle cx="28" cy="28" r="1.4" fill="#1e293b" />
      <circle cx="36" cy="28" r="1.4" fill="#1e293b" />
      {/* Soft smile */}
      <path d="M29 33 Q32 35.5 35 33" fill="none" stroke="#c2410c" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  </div>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onSaveSettings,
  onDataRestored,
  onClearAllConversations,
  onOpenCustomize,
  isApiKeyConfigured,
}) => {
  const [draftSettings, setDraftSettings] = useState<CompanionSettings>(settings);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [micPermissionState, setMicPermissionState] = useState<string>('checking');
  const [exportNotice, setExportNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((permissionStatus) => {
          setMicPermissionState(permissionStatus.state);
          permissionStatus.onchange = () => {
            setMicPermissionState(permissionStatus.state);
          };
        })
        .catch(() => setMicPermissionState('prompt'));
    } else {
      setMicPermissionState('unknown');
    }
  }, []);

  const hasUnsavedChanges = JSON.stringify(draftSettings) !== JSON.stringify(settings);
  const voiceOutputActive =
    draftSettings.voiceEngine !== 'none' && draftSettings.autoSpeakResponse;
  const expressionsActive = draftSettings.expressionsEnabled !== false;

  const updateDraft = (updates: Partial<CompanionSettings>) => {
    setDraftSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleSaveChanges = () => {
    onSaveSettings(draftSettings, 'Settings saved');
  };

  const handleConfirmReset = () => {
    const resetTarget: CompanionSettings = {
      ...DEFAULT_SETTINGS,
      userName: draftSettings.userName,
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
      text: 'Export complete! Your data was saved to a local JSON file.',
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
        setExportNotice({ type: 'success', text: 'Import successful! Data restored.' });
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
          text: 'Failed to import: Invalid backup JSON file.',
        });
      }
    };
    reader.onerror = () => {
      input.value = '';
      setExportNotice({
        type: 'error',
        text: 'Could not read the selected file. Please try again.',
      });
    };
    reader.readAsText(file);
  };

  return (
    <SubpageBackdrop>
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col justify-center gap-6">
        {/* Heading */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeading
            title="Settings"
            subtitle="Customize your experience"
          />
          {hasUnsavedChanges && (
            <span className="text-xs font-medium text-blue-700 dark:text-sky-300">
              Unsaved changes ready to save
            </span>
          )}
        </div>

        {/* Two Side-by-Side Glass Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* Left Panel: General Settings */}
          <section
            aria-label="General Settings"
            className="rounded-2xl bg-white dark:bg-[#091332]/86 border border-slate-200 dark:border-indigo-400/28 p-5 sm:p-6 shadow-xs dark:shadow-[0_18px_42px_rgba(3,8,28,0.55)] flex flex-col justify-between gap-4"
          >
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                General Settings
              </h2>

              {/* Language Row */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070f28]/85 border border-slate-200 dark:border-indigo-400/18 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-sky-500/20 border border-blue-200 dark:border-sky-400/30 flex items-center justify-center text-blue-600 dark:text-sky-300 shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <label
                    htmlFor="settings-language-select"
                    className="text-sm font-medium text-slate-800 dark:text-slate-100"
                  >
                    Language
                  </label>
                </div>

                <select
                  id="settings-language-select"
                  value={draftSettings.language}
                  onChange={(e) =>
                    updateDraft({ language: e.target.value as CompanionLanguage })
                  }
                  className="h-9 min-w-[140px] rounded-xl bg-white dark:bg-[#0c1a42] border border-slate-200 dark:border-indigo-300/28 px-3 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Output Row */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070f28]/85 border border-slate-200 dark:border-indigo-400/18 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-indigo-500/18 border border-slate-300/70 dark:border-indigo-300/25 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Voice Output
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={voiceOutputActive}
                  aria-label="Toggle voice output"
                  onClick={() =>
                    updateDraft({
                      autoSpeakResponse: !voiceOutputActive,
                      voiceEngine:
                        !voiceOutputActive && draftSettings.voiceEngine === 'none'
                          ? 'gemini-native'
                          : draftSettings.voiceEngine,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                    voiceOutputActive ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                      voiceOutputActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Theme Segmented Row (Auto / Light / Dark) */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070f28]/85 border border-slate-200 dark:border-indigo-400/18 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-indigo-500/18 border border-slate-300/70 dark:border-indigo-300/25 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                    <Palette className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Theme
                  </span>
                </div>

                <div
                  role="radiogroup"
                  aria-label="Theme mode"
                  className="grid grid-cols-3 gap-2"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={draftSettings.theme === 'auto'}
                    onClick={() => updateDraft({ theme: 'auto' })}
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      draftSettings.theme === 'auto'
                        ? 'bg-blue-600 border-sky-300/50 text-white shadow-sm'
                        : 'bg-white dark:bg-[#0b1638] border-slate-200 dark:border-indigo-400/20 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                    }`}
                  >
                    <span>Auto</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={draftSettings.theme === 'light'}
                    onClick={() => updateDraft({ theme: 'light' })}
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      draftSettings.theme === 'light'
                        ? 'bg-blue-600 border-sky-300/50 text-white shadow-sm'
                        : 'bg-white dark:bg-[#0b1638] border-slate-200 dark:border-indigo-400/20 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={draftSettings.theme === 'dark'}
                    onClick={() => updateDraft({ theme: 'dark' })}
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      draftSettings.theme === 'dark'
                        ? 'bg-blue-600 border-sky-300/50 text-white shadow-sm'
                        : 'bg-white dark:bg-[#0b1638] border-slate-200 dark:border-indigo-400/20 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Right Panel: Avatar Options */}
          <section
            aria-label="Avatar Options"
            className="rounded-2xl bg-white dark:bg-[#091332]/86 border border-slate-200 dark:border-indigo-400/28 p-5 sm:p-6 shadow-xs dark:shadow-[0_18px_42px_rgba(3,8,28,0.55)] flex flex-col justify-between gap-4"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Avatar Options
                </h2>
                {onOpenCustomize && (
                  <button
                    type="button"
                    onClick={onOpenCustomize}
                    className="text-xs font-medium text-blue-600 dark:text-sky-300 hover:underline cursor-pointer"
                  >
                    Customize 3D Stage →
                  </button>
                )}
              </div>

              {/* Expressions Toggle */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070f28]/85 border border-slate-200 dark:border-indigo-400/18 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-indigo-500/18 border border-slate-300/70 dark:border-indigo-300/25 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                    <Smile className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Expressions
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={expressionsActive}
                  aria-label="Toggle facial expressions"
                  onClick={() => updateDraft({ expressionsEnabled: !expressionsActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                    expressionsActive ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                      expressionsActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Appearance Presets Row (Real Supported Accent & Outfit Trim Presets) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Appearance
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {draftSettings.avatarConfig.outfitStyleLabel || 'Navy Classic'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  {APPEARANCE_THUMBNAILS.map((preset) => {
                    const isSelected =
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
                        title={preset.label}
                        aria-label={`Select ${preset.label} appearance`}
                        aria-pressed={isSelected}
                        className={`p-1.5 rounded-xl border transition cursor-pointer flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                          isSelected
                            ? 'border-blue-500 dark:border-sky-300 bg-blue-50 dark:bg-blue-600/20 shadow-[0_0_16px_rgba(56,189,248,0.3)]'
                            : 'border-slate-200 dark:border-indigo-400/20 bg-slate-50 dark:bg-[#070f28] hover:border-blue-300 dark:hover:border-indigo-300/45'
                        }`}
                      >
                        <AppearanceBustThumb
                          bgGradient={preset.bgGradient}
                          outfitColor={preset.outfitColor}
                          collarColor={preset.collarColor}
                        />
                        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-full">
                          {preset.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Reset to Default */}
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full h-10 rounded-xl bg-slate-100 dark:bg-[#0d193d] hover:bg-slate-200 dark:hover:bg-[#142559] border border-slate-200 dark:border-indigo-400/28 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/35 flex items-center justify-between gap-2 text-xs">
                <span className="text-amber-900 dark:text-amber-100 font-medium">
                  Reset all settings?
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="h-7 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="h-7 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Centered Purple Save Changes CTA */}
        <div className="flex flex-col items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSaveChanges}
            className="h-11 px-8 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-[0_10px_28px_rgba(99,102,241,0.45)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <Check className="w-4 h-4" />
            <span>Save Changes</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition"
          >
            <span>Personality, Voice Engine &amp; Backup Options</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Expandable Full Settings (Preserves All Existing Capabilities) */}
        {showAdvanced && (
          <div className="rounded-2xl bg-white dark:bg-[#091332]/90 border border-slate-200 dark:border-indigo-400/25 p-5 sm:p-6 space-y-6 shadow-sm animate-fadeIn">
            {/* Name & Personality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <label
                  htmlFor="user-name-input"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  What should Ātmiya call you?
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="user-name-input"
                    type="text"
                    value={draftSettings.userName}
                    onChange={(e) => updateDraft({ userName: e.target.value })}
                    placeholder="Enter your name..."
                    className="w-full h-10 bg-slate-50 dark:bg-[#060d24] border border-slate-200 dark:border-indigo-400/22 rounded-xl pl-9 pr-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Speech Output Engine
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'gemini-native' as const, label: 'Gemini TTS' },
                      { id: 'browser-tts' as const, label: 'Browser TTS' },
                      { id: 'none' as const, label: 'Silent' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => updateDraft({ voiceEngine: mode.id })}
                        className={`h-9 px-2 rounded-xl border text-xs font-medium cursor-pointer transition ${
                          draftSettings.voiceEngine === mode.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/25 text-blue-800 dark:text-white'
                            : 'border-slate-200 dark:border-indigo-400/20 bg-slate-50 dark:bg-[#060d24] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {draftSettings.voiceEngine === 'gemini-native' && (
                  <div className="pt-1 space-y-2">
                    <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Gemini Voice Model
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
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/25 text-blue-800 dark:text-white'
                              : 'border-slate-200 dark:border-indigo-400/20 bg-slate-50 dark:bg-[#060d24] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#060d24] border border-slate-200 dark:border-indigo-400/20 cursor-pointer gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                      Hands-Free Voice Flow
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Automatically listen after Ātmiya finishes speaking
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={draftSettings.handsFreeMode}
                    onChange={(e) => updateDraft({ handsFreeMode: e.target.checked })}
                    className="accent-blue-600 w-4 h-4 shrink-0"
                  />
                </label>
              </div>

              {/* Personality Mode */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Companion Personality Mode
                </span>
                <div className="space-y-2">
                  {PERSONALITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => updateDraft({ personality: p.id })}
                      className={`w-full p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        draftSettings.personality === p.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/25'
                          : 'border-slate-200 dark:border-indigo-400/20 bg-slate-50 dark:bg-[#060d24]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {p.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {p.subtitle}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Backup, Privacy & API Status */}
            <div className="pt-4 border-t border-slate-200 dark:border-indigo-400/20 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#060d24] border border-slate-200 dark:border-indigo-400/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                  <HardDrive className="w-4 h-4 text-blue-600 dark:text-sky-300" />
                  <span>Backup & Restore (Local JSON)</span>
                </div>
                {exportNotice && (
                  <div
                    role="status"
                    className={`p-2 rounded-lg text-[11px] ${
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
                    className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Backup</span>
                  </button>
                  <label className="h-9 px-3.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Restore</span>
                    <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#060d24] border border-slate-200 dark:border-indigo-400/20 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Mic className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300" />
                    Microphone
                  </span>
                  <span className="font-semibold text-blue-700 dark:text-sky-300 uppercase text-[11px]">
                    {micPermissionState}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Server Gemini API
                  </span>
                  <span
                    className={
                      isApiKeyConfigured
                        ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'text-amber-600 dark:text-amber-300 font-semibold'
                    }
                  >
                    {isApiKeyConfigured ? 'Ready' : 'Not Configured'}
                  </span>
                </div>

                {!showClearChatsConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowClearChatsConfirm(true)}
                    className="h-8 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/35 text-[11px] font-semibold text-rose-700 dark:text-rose-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Conversation History</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Delete all chats?
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllConversations();
                          setShowClearChatsConfirm(false);
                        }}
                        className="h-7 px-2.5 rounded bg-rose-600 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClearChatsConfirm(false)}
                        className="h-7 px-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SubpageBackdrop>
  );
};
