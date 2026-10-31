import React from 'react';
import { 
  Menu, 
  PhoneCall, 
  Brain, 
  Settings, 
  Palette, 
  Globe, 
  Sparkles,
  ShieldCheck,
  Volume2,
  VolumeX
} from 'lucide-react';
import { 
  CompanionLanguage, 
  CompanionPersonality, 
  CompanionSettings 
} from '../types/companion';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenVoiceMode: () => void;
  onOpenMemoryModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenAvatarCustomizer: () => void;
  settings: CompanionSettings;
  onUpdateSettings: (newSettings: CompanionSettings) => void;
  memoriesCount: number;
  isKeyConfigured: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenVoiceMode,
  onOpenMemoryModal,
  onOpenSettingsModal,
  onOpenAvatarCustomizer,
  settings,
  onUpdateSettings,
  memoriesCount,
  isKeyConfigured,
}) => {
  const languageLabels: Record<CompanionLanguage, string> = {
    auto: 'Auto (स्वतः)',
    hi: 'हिन्दी (Hindi)',
    hinglish: 'Hinglish',
    en: 'English',
  };

  const personalityLabels: Record<CompanionPersonality, string> = {
    calm: 'Calm (शांत)',
    friendly: 'Friendly (दोस्ताना)',
    reflective: 'Reflective (गंभीर)',
    study: 'Study/Code (अध्ययन)',
    creative: 'Creative (रचनात्मक)',
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
      {/* Left section: Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer"
          title="Toggle History Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-900/40 text-white font-serif font-bold text-lg select-none">
            आ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                Ātmiya
              </span>
              <span className="font-serif text-sm font-semibold text-violet-400">
                आत्मीय
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-950/80 border border-violet-800/50 text-violet-300">
                {personalityLabels[settings.personality]}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block -mt-0.5">
              Your personal AI companion • यह तुम्हारी अपनी जगह है
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Language selector pill */}
        <div className="relative hidden md:block">
          <select
            value={settings.language}
            onChange={(e) =>
              onUpdateSettings({ ...settings, language: e.target.value as CompanionLanguage })
            }
            className="appearance-none bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-1.5 pr-7 focus:outline-none focus:border-violet-500 cursor-pointer transition"
          >
            <option value="auto">🌐 Auto-detect</option>
            <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
            <option value="hinglish">✨ Hinglish</option>
            <option value="en">🇬🇧 English</option>
          </select>
          <Globe className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        {/* Live Two-Way Voice Call Action Button */}
        <button
          onClick={onOpenVoiceMode}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/50 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
          title="Start Live Voice Conversation"
        >
          <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">Voice Mode (आवाज़ में बात करें)</span>
          <span className="sm:hidden">Voice</span>
        </button>

        {/* Memory Button */}
        <button
          onClick={onOpenMemoryModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs transition cursor-pointer"
          title="Personal Memory Management"
        >
          <Brain className="w-4 h-4 text-violet-400" />
          <span className="hidden lg:inline">Memory</span>
          {memoriesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-violet-600 text-white">
              {memoriesCount}
            </span>
          )}
        </button>

        {/* Avatar Customizer */}
        <button
          onClick={onOpenAvatarCustomizer}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-violet-300 transition cursor-pointer"
          title="Customize Avatar & Persona"
        >
          <Palette className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettingsModal}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          title="Settings & Privacy"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
