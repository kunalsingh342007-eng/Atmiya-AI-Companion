import React, { useState } from 'react';
import {
  CameraFramingPreset,
  CompanionLanguage,
  CompanionSettings,
  UserProfile,
} from '../../types/companion';
import { ProfileAvatar } from '../Profile/ProfileAvatar';
import { isValidProfileImageUrl, processProfileImageFile } from '../../utils/profileImage';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User,
  Volume2,
} from 'lucide-react';

interface OnboardingFlowProps {
  initialProfile: UserProfile;
  initialSettings: CompanionSettings;
  isApiKeyConfigured: boolean;
  onPreviewTheme: (theme: 'auto' | 'dark' | 'light') => void;
  onComplete: (profile: UserProfile, settings: CompanionSettings) => void;
  onContinueExisting?: () => void;
}

const LANGUAGES: { id: CompanionLanguage; label: string; desc: string }[] = [
  { id: 'auto', label: 'Auto-detect', desc: 'Follows English, Hindi, or Hinglish naturally' },
  { id: 'en', label: 'English', desc: 'Clear conversational English' },
  { id: 'hi', label: 'हिन्दी (Hindi)', desc: 'Natural everyday Devanagari Hindi' },
  { id: 'hinglish', label: 'Hinglish', desc: 'Casual Hindi + English blend' },
];

const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore', note: 'Calm, soothing' },
  { id: 'Puck', label: 'Puck', note: 'Warm, upbeat' },
  { id: 'Fenrir', label: 'Fenrir', note: 'Deep, grounded' },
  { id: 'Zephyr', label: 'Zephyr', note: 'Gentle, airy' },
  { id: 'Charon', label: 'Charon', note: 'Steady, mature' },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialProfile,
  initialSettings,
  isApiKeyConfigured,
  onPreviewTheme,
  onComplete,
  onContinueExisting,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [logoError, setLogoError] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState(
    initialProfile.displayName || initialSettings.userName || ''
  );
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(
    initialProfile.avatarDataUrl
  );
  const [imageUrlInput, setImageUrlInput] = useState(
    initialProfile.avatarDataUrl && !initialProfile.avatarDataUrl.startsWith('data:')
      ? initialProfile.avatarDataUrl
      : ''
  );
  const [bio, setBio] = useState(initialProfile.bio || '');
  const [imageError, setImageError] = useState<string | null>(null);

  // Preferences fields
  const [language, setLanguage] = useState<CompanionLanguage>(initialSettings.language);
  const [theme, setTheme] = useState<'auto' | 'dark' | 'light'>(initialSettings.theme);
  const [voiceEngine, setVoiceEngine] = useState<CompanionSettings['voiceEngine']>(
    initialSettings.voiceEngine
  );
  const [selectedVoice, setSelectedVoice] = useState(initialSettings.selectedVoice || 'Kore');
  const [defaultCameraPreset, setDefaultCameraPreset] = useState<CameraFramingPreset>(
    initialSettings.avatarConfig.defaultCameraPreset ?? 'close-up'
  );

  const hasExistingProfile = Boolean(
    initialProfile.onboardingCompleted || initialProfile.displayName.trim()
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setAvatarDataUrl(result.dataUrl);
      setImageUrlInput('');
    }
  };

  const handleApplyUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) {
      setAvatarDataUrl(undefined);
      setImageError(null);
      return;
    }
    if (!isValidProfileImageUrl(trimmed)) {
      setImageError('Please enter a valid http(s) image URL.');
      return;
    }
    setImageError(null);
    setAvatarDataUrl(trimmed);
  };

  const handleSelectTheme = (nextTheme: 'auto' | 'dark' | 'light') => {
    setTheme(nextTheme);
    onPreviewTheme(nextTheme);
  };

  const buildCompletedState = (): { profile: UserProfile; settings: CompanionSettings } => {
    const now = Date.now();
    const cleanName = displayName.trim();
    const profile: UserProfile = {
      displayName: cleanName,
      avatarDataUrl: avatarDataUrl || undefined,
      bio: bio.trim(),
      onboardingCompleted: true,
      createdAt: initialProfile.createdAt || now,
      updatedAt: now,
    };
    const nextSettings: CompanionSettings = {
      ...initialSettings,
      userName: cleanName,
      language,
      theme,
      voiceEngine,
      selectedVoice,
      autoSpeakResponse: voiceEngine !== 'none',
      avatarConfig: {
        ...initialSettings.avatarConfig,
        defaultCameraPreset,
      },
    };
    return { profile, settings: nextSettings };
  };

  const handleFinish = () => {
    const { profile, settings } = buildCompletedState();
    onComplete(profile, settings);
  };

  const browserSpeechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div className="min-h-dvh w-full bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col items-center justify-center px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 transition-colors duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-[var(--bg-surface)] dark:bg-[#0b132b] border border-slate-200 dark:border-slate-800/90 shadow-xl dark:shadow-[0_24px_64px_rgba(2,6,23,0.65)] overflow-hidden">
        {/* Progress Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 tabular-nums">
            Step {step} of 4
          </span>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === step
                    ? 'w-7 bg-indigo-600 dark:bg-indigo-400'
                    : idx < step
                    ? 'w-4 bg-indigo-300 dark:bg-indigo-700'
                    : 'w-4 bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {step === 1 && (
            <div className="text-center space-y-6 py-2 animate-fadeIn">
              <div className="mx-auto w-36 rounded-2xl bg-indigo-50/90 dark:bg-[#060c23] p-3 border border-indigo-200 dark:border-indigo-400/20 shadow-md dark:shadow-lg">
                {/* Light mode brand emblem */}
                <div className="py-3 text-center dark:hidden">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-600 text-white font-serif text-xl font-bold flex items-center justify-center mb-1.5">
                    आ
                  </div>
                  <div className="text-xl font-bold text-slate-900">Ātmiya</div>
                  <div className="text-xs text-slate-600">Your AI Companion</div>
                </div>
                {/* Dark/Night mode brand artwork */}
                <div className="hidden dark:block">
                  {!logoError ? (
                    <img
                      src="/assets/branding/atmiya-logo.png"
                      alt="Ātmiya — Your AI Companion"
                      referrerPolicy="no-referrer"
                      onError={() => setLogoError(true)}
                      className="w-full h-auto rounded-lg object-contain mx-auto"
                    />
                  ) : (
                    <div className="py-4 text-center">
                      <div className="text-xl font-bold text-white">Ātmiya</div>
                      <div className="text-xs text-slate-300">Your AI Companion</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Welcome to Ātmiya
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Your space to talk, explore, and grow.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-800 p-4 text-left flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Your profile, preferences, and conversation history stay stored locally in this browser. You can change or clear everything anytime in Settings.
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto h-11 px-7 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {hasExistingProfile && onContinueExisting && (
                  <button
                    type="button"
                    onClick={onContinueExisting}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium transition cursor-pointer"
                  >
                    Continue to Ātmiya
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Set up your profile
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Tell Ātmiya how to address you. Everything here is optional and stored locally.
                </p>
              </div>

              {/* Avatar Preview + Upload */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-800">
                <ProfileAvatar
                  displayName={displayName || 'You'}
                  avatarDataUrl={avatarDataUrl}
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
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    {avatarDataUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarDataUrl(undefined);
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
                      placeholder="Or paste an https:// image URL (optional)"
                      aria-label="Profile image URL"
                      className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-white dark:bg-[#0b132b] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="h-8 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      Use
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
                    htmlFor="onboarding-display-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Preferred Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="onboarding-display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={80}
                      placeholder="e.g. Kunal, Ananya..."
                      className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="onboarding-bio"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Short Personal Intro <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="onboarding-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={200}
                    rows={2}
                    placeholder="e.g. Computer science student who enjoys thoughtful late-night talks and quick study breaks."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-10 px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayName('');
                      setBio('');
                      setAvatarDataUrl(undefined);
                      setStep(3);
                    }}
                    className="h-10 px-4 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Personalize your preferences
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Choose how Ātmiya looks and communicates with you.
                </p>
              </div>

              {/* Appearance */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                  Appearance
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Theme preference">
                  {[
                    { id: 'light' as const, label: 'Light', icon: Sun },
                    { id: 'dark' as const, label: 'Dark / Night', icon: Moon },
                    { id: 'auto' as const, label: 'System', icon: Sparkles },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => handleSelectTheme(item.id)}
                        className={`min-h-[42px] px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                          active
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-50 dark:bg-[#081024] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <label
                  htmlFor="onboarding-lang"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Conversation Language</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map((l) => {
                    const active = language === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLanguage(l.id)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-slate-900 dark:text-white'
                            : 'bg-slate-50 dark:bg-[#081024] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-semibold">{l.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {l.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voice Preference */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Voice Replies</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'gemini-native' as const, label: 'Gemini Voice' },
                    { id: 'browser-tts' as const, label: 'Browser Voice' },
                    { id: 'none' as const, label: 'Text Only' },
                  ].map((v) => {
                    const active = voiceEngine === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVoiceEngine(v.id)}
                        className={`min-h-[40px] px-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                          active
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-50 dark:bg-[#081024] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>

                {voiceEngine === 'gemini-native' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex flex-wrap gap-1.5">
                      {GEMINI_VOICES.map((voice) => (
                        <button
                          key={voice.id}
                          type="button"
                          onClick={() => setSelectedVoice(voice.id)}
                          title={voice.note}
                          className={`h-8 px-3 rounded-lg border text-xs font-medium cursor-pointer transition ${
                            selectedVoice === voice.id
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-white'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#081024] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {voice.label}
                        </button>
                      ))}
                    </div>
                    {!isApiKeyConfigured && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Gemini API key is not configured on the server; replies will automatically fall back to browser speech if available.
                      </p>
                    )}
                  </div>
                )}

                {voiceEngine === 'browser-tts' && !browserSpeechSupported && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Browser speech synthesis is unavailable in this browser. You can still read replies as text.
                  </p>
                )}
              </div>

              {/* Avatar Framing */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                  Default Avatar Framing
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'close-up' as const, label: 'Close-Up' },
                    { id: 'upper-body' as const, label: 'Upper Body' },
                    { id: 'full-body' as const, label: 'Full View' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDefaultCameraPreset(preset.id)}
                      className={`min-h-[40px] px-3 rounded-xl border text-xs font-medium transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        defaultCameraPreset === preset.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-white'
                          : 'bg-slate-50 dark:bg-[#081024] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-10 px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-4">
                <ProfileAvatar
                  displayName={displayName || 'You'}
                  avatarDataUrl={avatarDataUrl}
                  size="lg"
                />
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {displayName.trim() ? `Ready when you are, ${displayName.trim()}` : 'Ready to begin'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                    Your preferences are saved locally on this device.
                  </p>
                </div>
              </div>

              <dl className="rounded-2xl bg-slate-50 dark:bg-[#081024] border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <dt className="text-slate-500 dark:text-slate-400">Display Name</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white break-words">
                    {displayName.trim() || 'Not set'}
                  </dd>
                </div>
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <dt className="text-slate-500 dark:text-slate-400">Appearance</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {theme === 'auto' ? 'System' : theme === 'dark' ? 'Dark / Night' : 'Light'}
                  </dd>
                </div>
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <dt className="text-slate-500 dark:text-slate-400">Language</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {LANGUAGES.find((l) => l.id === language)?.label ?? 'Auto-detect'}
                  </dd>
                </div>
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <dt className="text-slate-500 dark:text-slate-400">Voice</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {voiceEngine === 'none'
                      ? 'Text Only'
                      : voiceEngine === 'browser-tts'
                      ? 'Browser Voice'
                      : `Gemini (${selectedVoice})`}
                  </dd>
                </div>
              </dl>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="h-10 px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Enter Ātmiya</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
