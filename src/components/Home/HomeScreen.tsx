import React from 'react';
import {
  AvatarEmotion,
  AvatarState,
  CompanionLanguage,
  CompanionSettings,
  MicPermissionStatus,
} from '../../types/companion';
import { CompanionRoom } from '../Room/CompanionRoom';
import { CompanionHUD } from '../HUD/CompanionHUD';
import { AvatarStage } from '../Avatar/AvatarStage';
import { AvatarControllerActions, AvatarControllerState } from '../Avatar/AvatarController';
import { DialoguePanel } from '../Dialogue/DialoguePanel';
import { InteractionBar } from './InteractionBar';
import { Sparkles, X } from 'lucide-react';

interface HomeScreenProps {
  settings: CompanionSettings;
  avatarControllerState: AvatarControllerState;
  avatarControllerActions: AvatarControllerActions;
  avatarState: AvatarState;
  companionEmotion: AvatarEmotion;
  previewEmotion: AvatarEmotion | null;
  micPermission: MicPermissionStatus;
  isKeyConfigured: boolean;
  xp: number;
  prefersReducedMotion: boolean;
  speechBubbleText: string | null;
  showFirstTimeHint: boolean;
  userTranscript: string;
  aiSpokenText: string;
  voiceError: string | null;
  isMicMuted: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isChatDrawerOpen: boolean;
  unreadCount: number;
  onDismissBubble: () => void;
  onDismissHint: () => void;
  onToggleSidebar: () => void;
  onToggleSound: () => void;
  onChangeLanguage: (lang: CompanionLanguage) => void;
  onOpenSettings: () => void;
  onNavigatePlay: () => void;
  onNavigateWardrobe: () => void;
  onSendMessage: (text: string) => void;
  onToggleListen: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onEndCall: () => void;
  onRetryMic: () => void;
  onToggleChatDrawer: () => void;
  onQuickReaction: (emotion: AvatarEmotion, label: string, line: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  settings,
  avatarControllerState,
  avatarControllerActions,
  avatarState,
  companionEmotion,
  previewEmotion,
  micPermission,
  isKeyConfigured,
  xp,
  prefersReducedMotion,
  speechBubbleText,
  showFirstTimeHint,
  userTranscript,
  aiSpokenText,
  voiceError,
  isMicMuted,
  isThinking,
  isSpeaking,
  isChatDrawerOpen,
  unreadCount,
  onDismissBubble,
  onDismissHint,
  onToggleSidebar,
  onToggleSound,
  onChangeLanguage,
  onOpenSettings,
  onNavigatePlay,
  onNavigateWardrobe,
  onSendMessage,
  onToggleListen,
  onToggleMute,
  onInterrupt,
  onEndCall,
  onRetryMic,
  onToggleChatDrawer,
  onQuickReaction,
}) => {
  return (
    <CompanionRoom
      roomConfig={settings.roomConfig}
      avatarState={avatarState}
      prefersReducedMotion={prefersReducedMotion}
    >
      {/* Top Compact Game HUD */}
      <CompanionHUD
        settings={settings}
        avatarState={avatarState}
        emotion={previewEmotion ?? companionEmotion}
        micPermission={micPermission}
        isKeyConfigured={isKeyConfigured}
        xp={xp}
        onToggleSidebar={onToggleSidebar}
        onToggleSound={onToggleSound}
        onChangeLanguage={onChangeLanguage}
        onOpenSettings={onOpenSettings}
      />

      {/* Central Companion Stage with Subtle Speech Bubble & First-Time Hint */}
      <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center">
        {speechBubbleText && (
          <div className="relative z-20 mb-1 max-w-xs sm:max-w-sm px-3 animate-fadeIn">
            <div className="relative rounded-2xl bg-amber-50/95 text-slate-900 px-3.5 py-2 text-xs sm:text-[13px] font-medium shadow-xl border border-indigo-200/60 flex items-start gap-2">
              <span className="leading-snug flex-1">{speechBubbleText}</span>
              <button
                type="button"
                onClick={onDismissBubble}
                aria-label="Dismiss speech bubble"
                className="text-slate-500 hover:text-slate-800 p-0.5 rounded cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {showFirstTimeHint && !speechBubbleText && (
          <div className="relative z-20 mb-1 px-3 animate-fadeIn">
            <div className="rounded-full bg-indigo-950/85 border border-sky-300/40 backdrop-blur-md text-sky-100 px-3.5 py-1.5 text-[11px] font-medium shadow-lg flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
              <span>Tap Ātmiya to greet, or pick Talk, Play, or Customize below</span>
              <button
                type="button"
                onClick={onDismissHint}
                aria-label="Dismiss onboarding hint"
                className="text-sky-200 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <AvatarStage
          settings={settings}
          controller={avatarControllerState}
          actions={avatarControllerActions}
          onOpenCustomize={onNavigateWardrobe}
        />
      </div>

      {/* Contextual Game & Companion Controls */}
      <InteractionBar
        avatarState={avatarState}
        onTalk={onToggleListen}
        onOpenChat={onToggleChatDrawer}
        onNavigatePlay={onNavigatePlay}
        onNavigateWardrobe={onNavigateWardrobe}
        onQuickReaction={onQuickReaction}
      />

      {/* Compact Dialogue Panel above Bottom Nav */}
      <DialoguePanel
        avatarState={avatarState}
        personaName={settings.avatarConfig.personaName}
        userTranscript={userTranscript}
        aiSpokenText={aiSpokenText}
        voiceError={voiceError}
        micPermission={micPermission}
        isMicMuted={isMicMuted}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
        isChatDrawerOpen={isChatDrawerOpen}
        unreadCount={unreadCount}
        language={settings.language}
        onSendMessage={onSendMessage}
        onToggleListen={onToggleListen}
        onToggleMute={onToggleMute}
        onInterrupt={onInterrupt}
        onEndCall={onEndCall}
        onRetryMic={onRetryMic}
        onToggleChatDrawer={onToggleChatDrawer}
        onChangeLanguage={onChangeLanguage}
      />
    </CompanionRoom>
  );
};
