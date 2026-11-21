import React, { useEffect, useState } from 'react';
import {
  CompanionLanguage,
  CompanionPersonality,
  CompanionSettings,
} from '../../types/companion';
import { storage } from '../../services/storage';
import {
  AlertTriangle,
  Download,
  HardDrive,
  Mic,
  Moon,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  User,
  Volume2,
} from 'lucide-react';

interface SettingsScreenProps {
  settings: CompanionSettings;
  onSaveSettings: (settings: CompanionSettings) => void;
  onDataRestored?: () => void;
  onClearAllConversations: () => void;
  isApiKeyConfigured: boolean;
}

const PERSONALITIES: { id: CompanionPersonality; title: string; subtitle: string; desc: string }[] = [
  {
    id: 'calm',
    title: 'Calm & Gentle (शांत और सौम्य)',
    subtitle: 'Warm, reassuring, empathetic listener',
    desc: 'Listens with gentle patience, provides peaceful clarity, validates emotional well-being.',
  },
  {
    id: 'friendly',
    title: 'Friendly & Playful (दोस्ताना और चुलबुला)',
    subtitle: 'Witty, vibrant, upbeat companion',
    desc: 'Brings lighthearted humor, conversational banter, and cheering encouragement.',
  },
  {
    id: 'reflective',
    title: 'Thoughtful & Reflective (गंभीर और विचारशील)',
    subtitle: 'Philosophical, curious, deep thinker',
    desc: 'Asks meaningful open questions, explores life topics, literature, and human nature.',
  },
  {
    id: 'study',
    title: 'Study & Code Partner (अध्ययन और कोडिंग साथी)',
    subtitle: 'Patient tutor for C++, DSA, STEM & Exams',
    desc: 'Explains complex topics with analogies, breaks down code step-by-step with clean intuition.',
  },
  {
    id: 'creative',
    title: 'Creative Brainstormer (रचनात्मक मार्गदर्शक)',
    subtitle: 'Inventive, lateral thinking collaborator',
    desc: 'Generates fresh concepts, project architectures, and imaginative stories.',
  },
];

const LANGUAGES: { id: CompanionLanguage; label: string; script: string }[] = [
  { id: 'auto', label: 'Auto-detect (स्वतः पहचानें)', script: 'Matches user language automatically' },
  { id: 'hi', label: 'हिन्दी (Hindi)', script: 'Pure Devanagari conversational Hindi' },
  { id: 'hinglish', label: 'Hinglish (हिंग्लिश)', script: 'Conversational Hindi in Roman script' },
  { id: 'en', label: 'English', script: 'Standard natural English' },
];

const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore', tone: 'Calm, soothing, feminine presence' },
  { id: 'Puck', label: 'Puck', tone: 'Warm, youthful, energetic' },
  { id: 'Fenrir', label: 'Fenrir', tone: 'Deep, resonant, grounding voice' },
  { id: 'Zephyr', label: 'Zephyr', tone: 'Airy, serene, gentle cadence' },
  { id: 'Charon', label: 'Charon', tone: 'Mature, steady, dignified tone' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onSaveSettings,
  onDataRestored,
  onClearAllConversations,
  isApiKeyConfigured,
}) => {
  const [activeTab, setActiveTab] = useState<'personality' | 'voice' | 'privacy' | 'storage'>(
    'personality'
  );
  const [localSettings, setLocalSettings] = useState<CompanionSettings>(settings);
  const [micPermissionState, setMicPermissionState] = useState<string>('checking');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
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
        .catch(() => {
          setMicPermissionState('prompt');
        });
    } else {
      setMicPermissionState('unknown');
    }
  }, []);

  const handleUpdate = (updates: Partial<CompanionSettings>) => {
    const next = { ...localSettings, ...updates };
    setLocalSettings(next);
    onSaveSettings(next);
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
    setExportNotice('Export complete! Your data was saved to a local JSON file.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storage.importData(content);
      if (success) {
        setExportNotice('Import successful! Data restored.');
        setLocalSettings(storage.getSettings());
        if (onDataRestored) {
          onDataRestored();
        } else {
          onSaveSettings(storage.getSettings());
        }
        setTimeout(() => setExportNotice(null), 3000);
      } else {
        setExportNotice('Failed to import: Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 dark:bg-gradient-to-b dark:from-[#070d1a] dark:via-[#0b162d] dark:to-[#070d1a] px-4 sm:px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <header className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-500/35 text-blue-600 dark:text-sky-300 flex items-center justify-center shrink-0">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Settings & Preferences (सेटिंग्स)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Configure theme, personality, voice engine, languages, backups, and privacy.
            </p>
          </div>
        </header>

        {/* Sub-Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'personality' as const, label: 'Appearance & Personality' },
            { id: 'voice' as const, label: 'Voice & Microphone' },
            { id: 'privacy' as const, label: 'Privacy & Trust' },
            { id: 'storage' as const, label: 'Backup & History' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-10 px-4 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-[#0c162b] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Card Surface */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 shadow-sm dark:shadow-2xl space-y-6">
          {activeTab === 'personality' && (
            <div className="space-y-6">
              {/* Theme Mode Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Interface Theme (थीम)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleUpdate({ theme: 'dark' })}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-3 ${
                      localSettings.theme !== 'light'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#091224] border border-slate-700 flex items-center justify-center text-sky-300 shrink-0">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs">Deep Navy Dark (Default)</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Focused slate-navy surfaces with crisp blue highlights
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdate({ theme: 'light' })}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-3 ${
                      localSettings.theme === 'light'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-500 shrink-0">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs">Soft Neutral Light</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Clean daylight white surfaces with navy-blue accents
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  What should Ātmiya call you? (आपका नाम)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={localSettings.userName}
                    onChange={(e) => handleUpdate({ userName: e.target.value })}
                    placeholder="Enter your name or nickname..."
                    className="w-full bg-slate-50 dark:bg-[#081020] border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Preferred Language (भाषा प्राथमिकता)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => handleUpdate({ language: lang.id })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        localSettings.language === lang.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs">{lang.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {lang.script}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Companion Personality Mode (व्यक्तित्व मोड)
                </label>
                <div className="space-y-2.5">
                  {PERSONALITIES.map((p) => {
                    const isSelected = localSettings.personality === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleUpdate({ personality: p.id })}
                        className={`w-full p-3.5 rounded-xl border text-left transition flex items-start justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] hover:border-blue-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {p.title}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-sky-300 mt-0.5">
                            {p.subtitle}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {p.desc}
                          </div>
                        </div>
                        <span
                          className={`w-4 h-4 rounded-full mt-1 border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-600'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Speech Output Mode (आवाज़ मॉडल)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'gemini-native' as const,
                      title: 'Gemini Flash TTS',
                      sub: 'High quality 24kHz native voice',
                    },
                    {
                      id: 'browser-tts' as const,
                      title: 'Browser Speech',
                      sub: 'Web Speech Synthesis fallback',
                    },
                    {
                      id: 'none' as const,
                      title: 'Silent (Text Only)',
                      sub: 'No automated audio playback',
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleUpdate({ voiceEngine: mode.id })}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        localSettings.voiceEngine === mode.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs">{mode.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {mode.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {localSettings.voiceEngine === 'gemini-native' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Gemini Voice Model
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {GEMINI_VOICES.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleUpdate({ selectedVoice: v.id })}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                          localSettings.selectedVoice === v.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#081020] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center justify-between">
                          <span>{v.label}</span>
                          <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {v.tone}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#081020] border border-slate-200 dark:border-slate-800 cursor-pointer gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                      Auto-speak responses & game sound chimes
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Plays voice replies and subtle Web Audio chimes during mini-games.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.autoSpeakResponse}
                    onChange={(e) => handleUpdate({ autoSpeakResponse: e.target.checked })}
                    className="accent-blue-600 w-4 h-4 shrink-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#081020] border border-slate-200 dark:border-slate-800 cursor-pointer gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                      Hands-Free Voice Flow (ऑटो लिसन)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Automatically starts listening after Ātmiya finishes speaking.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.handsFreeMode}
                    onChange={(e) => handleUpdate({ handsFreeMode: e.target.checked })}
                    className="accent-blue-600 w-4 h-4 shrink-0"
                  />
                </label>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#081020] border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300" />
                    Microphone Permission Status
                  </span>
                  <span className="font-semibold uppercase text-[11px] text-blue-700 dark:text-sky-300">
                    {micPermissionState}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Voice input only activates when you press Speak/Mic. Audio streams are not saved permanently by the application.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#081020] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Transparent Local-First Privacy Architecture</span>
                </div>
                <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 list-disc pl-5 leading-relaxed">
                  <li>
                    <strong>Local Storage Only:</strong> Conversations, approved memories, and progression stay in your browser’s localStorage with zero ads or tracking telemetry.
                  </li>
                  <li>
                    <strong>Server-Side API Proxy:</strong> The Gemini API key stays strictly on the server and is never exposed to client code.
                  </li>
                  <li>
                    <strong>No Manipulative Mechanics:</strong> No countdown pressure, fake streaks, loot boxes, or hidden prompts.
                  </li>
                  <li>
                    <strong>Microphone Transparency:</strong> Voice recognition runs only when requested; raw microphone audio is never archived.
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#081020] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Gemini Server API Key:</span>
                <span
                  className={
                    isApiKeyConfigured
                      ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'text-amber-700 dark:text-amber-300 font-semibold'
                  }
                >
                  {isApiKeyConfigured ? 'Configured & Ready' : 'Not Configured'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#081020] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-sky-300 font-semibold text-sm">
                  <HardDrive className="w-4 h-4" />
                  <span>Data Portability & Backup</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Export your conversations, memories, settings, and game progression to JSON, or restore from an existing backup file.
                </p>

                {exportNotice && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700 text-xs text-emerald-800 dark:text-emerald-200">
                    {exportNotice}
                  </div>
                )}

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white inline-flex items-center gap-2 cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Backup (JSON)</span>
                  </button>

                  <label className="h-10 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-2 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Restore Backup</span>
                    <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#081020] border border-rose-200 dark:border-rose-500/25 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-rose-700 dark:text-rose-200">
                      Clear Conversation History
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      Removes all chat transcripts stored in this browser (memories remain untouched).
                    </div>
                  </div>
                  {!showClearChatsConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowClearChatsConfirm(true)}
                      className="h-9 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-500/40 text-xs font-semibold text-rose-700 dark:text-rose-200 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Chats</span>
                    </button>
                  )}
                </div>

                {showClearChatsConfirm && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-700 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-800 dark:text-rose-100">
                    <span className="inline-flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-300" />
                      Confirm deleting all conversations?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllConversations();
                          setShowClearChatsConfirm(false);
                        }}
                        className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClearChatsConfirm(false)}
                        className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
