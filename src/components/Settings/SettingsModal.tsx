import React, { useState, useEffect } from 'react';
import { CompanionSettings, CompanionPersonality, CompanionLanguage } from '../../types/companion';
import { 
  Settings as SettingsIcon, 
  Mic, 
  Volume2, 
  Globe, 
  User, 
  Sparkles, 
  ShieldCheck, 
  Download, 
  Upload, 
  Radio, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { storage } from '../../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanionSettings;
  onSaveSettings: (settings: CompanionSettings) => void;
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
    desc: 'Generates fresh robotics concepts, project architectures, startup ideas, and stories.',
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
  { id: 'Fenrir', label: 'Fenrir', tone: 'Deep, resonant, grounding male voice' },
  { id: 'Zephyr', label: 'Zephyr', tone: 'Airy, serene, gentle cadence' },
  { id: 'Charon', label: 'Charon', tone: 'Mature, steady, dignified tone' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  isApiKeyConfigured,
}) => {
  const [activeTab, setActiveTab] = useState<'personality' | 'voice' | 'privacy' | 'storage'>('personality');
  const [localSettings, setLocalSettings] = useState<CompanionSettings>(settings);
  const [micPermissionState, setMicPermissionState] = useState<string>('checking');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Check microphone permissions
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as any })
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
  }, [isOpen]);

  if (!isOpen) return null;

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
    setExportNotice('Export complete! Your data was saved to a local file.');
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
        setExportNotice('Import successful! Reloading settings...');
        setLocalSettings(storage.getSettings());
        onSaveSettings(storage.getSettings());
        setTimeout(() => setExportNotice(null), 3000);
      } else {
        setExportNotice('Failed to import: Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-950/80 border border-violet-500/30 text-violet-400">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-wide">
                Ātmiya Settings (सेटिंग्स और प्राथमिकताएं)
              </h3>
              <p className="text-xs text-slate-400">
                Personalize personality, voice model, languages, and privacy.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm px-2.5 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/20 gap-2">
          <button
            onClick={() => setActiveTab('personality')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'personality'
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Personality & Language
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'voice'
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Voice & Microphone
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Privacy & Trust
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'storage'
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Backup & Storage
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PERSONALITY & LANGUAGE */}
          {activeTab === 'personality' && (
            <div className="space-y-6">
              {/* User Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  What should Ātmiya call you? (आपका नाम)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={localSettings.userName}
                    onChange={(e) => handleUpdate({ userName: e.target.value })}
                    placeholder="Enter your name or nickname..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Preferred Language (भाषा प्राथमिकता)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => handleUpdate({ language: lang.id })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        localSettings.language === lang.id
                          ? 'border-violet-500 bg-violet-950/40 text-violet-200 shadow-sm'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-100">{lang.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{lang.script}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personality Modes */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Companion Personality Persona (व्यक्तित्व मोड)
                </label>
                <div className="space-y-2.5">
                  {PERSONALITIES.map((p) => {
                    const isSelected = localSettings.personality === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleUpdate({ personality: p.id })}
                        className={`w-full p-3.5 rounded-xl border text-left transition flex items-start justify-between cursor-pointer ${
                          isSelected
                            ? 'border-violet-500 bg-violet-950/40 shadow-sm shadow-violet-900/20'
                            : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-100">{p.title}</div>
                          <div className="text-xs text-violet-300 mt-0.5">{p.subtitle}</div>
                          <div className="text-xs text-slate-400 mt-1 leading-relaxed">{p.desc}</div>
                        </div>
                        <span
                          className={`w-4 h-4 rounded-full mt-1 border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-violet-400 bg-violet-500'
                              : 'border-slate-600'
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

          {/* TAB 2: VOICE & MICROPHONE */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              {/* Voice Engine Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Speech Output Mode (आवाज़ मॉडल)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleUpdate({ voiceEngine: 'gemini-native' })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      localSettings.voiceEngine === 'gemini-native'
                        ? 'border-violet-500 bg-violet-950/40 text-violet-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs">Gemini Flash TTS</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      High quality 24kHz native model
                    </div>
                  </button>
                  <button
                    onClick={() => handleUpdate({ voiceEngine: 'browser-tts' })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      localSettings.voiceEngine === 'browser-tts'
                        ? 'border-violet-500 bg-violet-950/40 text-violet-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs">Browser Speech</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Web Speech Synthesis fallback
                    </div>
                  </button>
                  <button
                    onClick={() => handleUpdate({ voiceEngine: 'none' })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      localSettings.voiceEngine === 'none'
                        ? 'border-violet-500 bg-violet-950/40 text-violet-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs">Silent (Text Only)</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      No automated audio playback
                    </div>
                  </button>
                </div>
              </div>

              {/* Gemini Voice Selection */}
              {localSettings.voiceEngine === 'gemini-native' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Gemini Voice Model
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {GEMINI_VOICES.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleUpdate({ selectedVoice: v.id })}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                          localSettings.selectedVoice === v.id
                            ? 'border-violet-500 bg-violet-950/40 text-violet-200'
                            : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-100 flex items-center justify-between">
                          <span>{v.label}</span>
                          <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">{v.tone}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto Speak & Hands Free */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Auto-speak responses in chat
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Plays audio automatically whenever Ātmiya answers in text chat.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.autoSpeakResponse}
                    onChange={(e) => handleUpdate({ autoSpeakResponse: e.target.checked })}
                    className="accent-violet-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Hands-Free Voice Flow (ऑटो लिसन)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Automatically starts listening after Ātmiya finishes speaking during a voice call.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.handsFreeMode}
                    onChange={(e) => handleUpdate({ handsFreeMode: e.target.checked })}
                    className="accent-violet-500 w-4 h-4"
                  />
                </label>
              </div>

              {/* Microphone Status & Troubleshooting */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-violet-400" />
                    Microphone Status
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      micPermissionState === 'granted'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : micPermissionState === 'denied'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {micPermissionState}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Speech recognition requires browser microphone permission. If audio fails,
                  ensure the browser has permitted microphone access in site settings.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY & TRUST */}
          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Transparent Local-Only Privacy Architecture</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ātmiya runs with strict privacy principles:
                </p>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-5 leading-relaxed">
                  <li>
                    <strong>Client-Side Scoped Storage:</strong> Your conversation history and approved memories
                    stay on your local browser. No 3rd-party user telemetry or ads tracker is included.
                  </li>
                  <li>
                    <strong>Zero Secret Exposure:</strong> The Gemini API key remains securely on the server-side proxy
                    and is never transmitted to the browser bundle.
                  </li>
                  <li>
                    <strong>No Emotional Exploitation:</strong> Ātmiya is honest about being an AI companion.
                    It supports mindfulness and learning while encouraging healthy offline human relationships.
                  </li>
                  <li>
                    <strong>Memory Control:</strong> You can review, edit, or delete any fact Ātmiya has saved at any time.
                  </li>
                </ul>
              </div>

              {/* Status Indicator */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Gemini Server Key:</span>
                <span className={isApiKeyConfigured ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                  {isApiKeyConfigured ? '✓ Configured & Active' : '⚠ Missing / Check Secrets'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP & STORAGE */}
          {activeTab === 'storage' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-violet-300 font-semibold text-sm">
                  <HardDrive className="w-4 h-4" />
                  <span>Data Portability & Backup</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Export all your conversations, custom memories, and preferences to a standard JSON backup file,
                  or restore from a previous backup on another device.
                </p>

                {exportNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-xs text-emerald-300">
                    {exportNotice}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Backup (JSON)
                  </button>

                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    Restore Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition shadow-lg shadow-violet-900/40 cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
