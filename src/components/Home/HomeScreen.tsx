import React from 'react';
import {
  AvatarEmotion,
  AvatarState,
  ChatMessage,
  CompanionLanguage,
  CompanionSettings,
  MicPermissionStatus,
} from '../../types/companion';
import { CompanionRoom } from '../Room/CompanionRoom';
import { CompanionHUD } from '../HUD/CompanionHUD';
import { AvatarStage } from '../Avatar/AvatarStage';
import { AvatarControllerActions, AvatarControllerState, AvatarGesture } from '../Avatar/AvatarController';
import { DialoguePanel } from '../Dialogue/DialoguePanel';
import { InteractionBar } from './InteractionBar';
import { ConversationPanel } from './ConversationPanel';
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
  chatError: string | null;
  isMicMuted: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isChatDrawerOpen: boolean;
  sessionTitle: string;
  messages: ChatMessage[];
  suggestedMemory: string | null;
  onDismissBubble: () => void;
  onDismissHint: () => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onToggleSound: () => void;
  onToggleTheme: () => void;
  onChangeLanguage: (lang: CompanionLanguage) => void;
  onOpenSettings: () => void;
  onNavigatePlay: () => void;
  onNavigateWardrobe: () => void;
  onSendMessage: (text: string) => void;
  onRetryLastMessage: () => void;
  onToggleListen: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onEndCall: () => void;
  onRetryMic: () => void;
  onToggleChatDrawer: () => void;
  onSaveSuggestedMemory: (memoryText: string) => void;
  onDismissMemorySuggestion: () => void;
  onQuickReaction: (
    emotion: AvatarEmotion,
    label: string,
    line: string,
    gesture?: AvatarGesture
  ) => void;
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
  chatError,
  isMicMuted,
  isThinking,
  isSpeaking,
  isChatDrawerOpen,
  sessionTitle,
  messages,
  suggestedMemory,
  onDismissBubble,
  onDismissHint,
  onToggleSidebar,
  onNewChat,
  onToggleSound,
  onToggleTheme,
  onChangeLanguage,
  onOpenSettings,
  onNavigatePlay,
  onNavigateWardrobe,
  onSendMessage,
  onRetryLastMessage,
  onToggleListen,
  onToggleMute,
  onInterrupt,
  onEndCall,
  onRetryMic,
  onToggleChatDrawer,
  onSaveSuggestedMemory,
  onDismissMemorySuggestion,
  onQuickReaction,
}) => {
  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden">
      {/* Left / Center Hero Stage */}
      <div className="flex-1 min-w-0 min-h-0 h-full">
        <CompanionRoom
          roomConfig={settings.roomConfig}
          avatarState={avatarState}
          prefersReducedMotion={prefersReducedMotion}
        >
          {/* Top Compact Companion HUD */}
          <CompanionHUD
            settings={settings}
            avatarState={avatarState}
            unifiedState={avatarControllerState.unifiedState}
            emotion={previewEmotion ?? companionEmotion}
            micPermission={micPermission}
            isKeyConfigured={isKeyConfigured}
            xp={xp}
            onToggleSidebar={onToggleSidebar}
            onToggleSound={onToggleSound}
            onToggleTheme={onToggleTheme}
            onChangeLanguage={onChangeLanguage}
            onOpenSettings={onOpenSettings}
          />

          {/* Central 3D Avatar Stage with Speech Bubble / First-Time Hint */}
          <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center">
            {speechBubbleText && (
              <div className="relative z-20 mb-1 max-w-xs sm:max-w-sm px-3 animate-fadeIn">
                <div className="relative rounded-2xl bg-white/95 dark:bg-[#0c162b]/95 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-[13px] font-medium shadow-xl border border-slate-200 dark:border-blue-400/30 flex items-start gap-2 backdrop-blur-md">
                  <span className="leading-snug flex-1">{speechBubbleText}</span>
                  <button
                    type="button"
                    onClick={onDismissBubble}
                    aria-label="Dismiss speech bubble"
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {showFirstTimeHint && !speechBubbleText && (
              <div className="relative z-20 mb-1 px-3 animate-fadeIn">
                <div className="rounded-xl bg-white/92 dark:bg-[#0c162b]/90 border border-slate-200 dark:border-sky-400/35 backdrop-blur-md text-slate-800 dark:text-sky-100 px-3.5 py-1.5 text-[11px] font-medium shadow-md flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300 shrink-0" />
                  <span>Tap Ātmiya to greet, or talk & message anytime</span>
                  <button
                    type="button"
                    onClick={onDismissHint}
                    aria-label="Dismiss onboarding hint"
                    className="text-slate-400 hover:text-slate-700 dark:text-sky-200 dark:hover:text-white cursor-pointer"
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

          {/* Contextual Reactions & Quick Actions */}
          <InteractionBar
            avatarState={avatarState}
            onTalk={onToggleListen}
            onOpenChat={onToggleChatDrawer}
            onNavigatePlay={onNavigatePlay}
            onNavigateWardrobe={onNavigateWardrobe}
            onQuickReaction={onQuickReaction}
          />

          {/* Compact Dialogue Panel on Mobile / Tablet (<lg) */}
          <DialoguePanel
            avatarState={avatarState}
            personaName={settings.avatarConfig.personaName}
            userTranscript={userTranscript}
            aiSpokenText={aiSpokenText}
            voiceError={voiceError}
            chatError={chatError}
            micPermission={micPermission}
            isMicMuted={isMicMuted}
            isThinking={isThinking}
            isSpeaking={isSpeaking}
            isChatDrawerOpen={isChatDrawerOpen}
            unreadCount={messages.length}
            language={settings.language}
            onSendMessage={onSendMessage}
            onRetryLastMessage={onRetryLastMessage}
            onToggleListen={onToggleListen}
            onToggleMute={onToggleMute}
            onInterrupt={onInterrupt}
            onEndCall={onEndCall}
            onRetryMic={onRetryMic}
            onToggleChatDrawer={onToggleChatDrawer}
            onChangeLanguage={onChangeLanguage}
          />
        </CompanionRoom>
      </div>

      {/* Desktop Right-Hand Live Conversation Workspace (lg+) */}
      <ConversationPanel
        sessionTitle={sessionTitle}
        messages={messages}
        settings={settings}
        avatarState={avatarState}
        userTranscript={userTranscript}
        voiceError={voiceError}
        chatError={chatError}
        micPermission={micPermission}
        isMicMuted={isMicMuted}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
        suggestedMemory={suggestedMemory}
        onOpenSessions={onToggleSidebar}
        onNewChat={onNewChat}
        onSendMessage={onSendMessage}
        onRetryLastMessage={onRetryLastMessage}
        onToggleListen={onToggleListen}
        onToggleMute={onToggleMute}
        onInterrupt={onInterrupt}
        onResetTurn={onEndCall}
        onRetryMic={onRetryMic}
        onSaveSuggestedMemory={onSaveSuggestedMemory}
        onDismissMemorySuggestion={onDismissMemorySuggestion}
      />
    </div>
  );
};
