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
  onDismissChatError?: () => void;
  onDismissVoiceError?: () => void;
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
  draftText?: string;
  onDraftChange?: (text: string) => void;
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
  onDismissChatError,
  onDismissVoiceError,
  onToggleListen,
  onToggleMute,
  onInterrupt,
  onEndCall,
  onRetryMic,
  onToggleChatDrawer,
  onSaveSuggestedMemory,
  onDismissMemorySuggestion,
  onQuickReaction,
  draftText,
  onDraftChange,
}) => {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Upper Workspace: Central 3D Companion Stage + Compact Right Conversation Panel */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Central 3D Avatar Area */}
        <div className="flex-1 min-w-0 min-h-0 h-full">
          <CompanionRoom
            roomConfig={settings.roomConfig}
            avatarState={avatarState}
            prefersReducedMotion={prefersReducedMotion}
          >
            {/* Top Toolbar */}
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

            {/* Central 3D Avatar Stage with Floating Caption / First-Time Hint */}
            <div className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden">
              <AvatarStage
                settings={settings}
                controller={avatarControllerState}
                actions={avatarControllerActions}
                onOpenCustomize={onNavigateWardrobe}
              />

              {speechBubbleText && (
                <div className="pointer-events-none absolute bottom-2 inset-x-0 z-20 flex justify-center px-3 animate-fadeIn">
                  <div className="pointer-events-auto max-w-sm sm:max-w-md rounded-2xl bg-white/95 dark:bg-[#091428]/95 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-[13px] font-medium shadow-xl border border-slate-200 dark:border-sky-400/25 flex items-start gap-2">
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
                <div className="pointer-events-none absolute bottom-2 inset-x-0 z-20 flex justify-center px-3 animate-fadeIn">
                  <div className="pointer-events-auto rounded-xl bg-white/95 dark:bg-[#091428]/94 border border-slate-200 dark:border-sky-400/25 text-slate-800 dark:text-sky-100 px-3.5 py-1.5 text-[11px] font-medium shadow-md flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300 shrink-0" />
                    <span>Tap Ātmiya to greet, or talk &amp; message below</span>
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
            </div>

            {/* Floating Avatar Quick Actions: Talk, Wave, Play, More */}
            <InteractionBar
              avatarState={avatarState}
              isMicMuted={isMicMuted}
              cameraPreset={avatarControllerState.cameraPreset}
              isExpressionsOpen={avatarControllerState.isExpressionsOpen}
              onTalk={onToggleListen}
              onToggleMute={onToggleMute}
              onOpenChat={onToggleChatDrawer}
              onNavigatePlay={onNavigatePlay}
              onNavigateWardrobe={onNavigateWardrobe}
              onChangeCameraPreset={avatarControllerActions.onChangeCameraPreset}
              onResetCamera={avatarControllerActions.onResetCamera}
              onToggleExpressions={
                avatarControllerActions.onSetExpressionsOpen
                  ? () =>
                      avatarControllerActions.onSetExpressionsOpen?.(
                        !avatarControllerState.isExpressionsOpen
                      )
                  : undefined
              }
              onQuickReaction={onQuickReaction}
            />
          </CompanionRoom>
        </div>

        {/* Desktop Compact Right-Side Conversation Panel (lg+) */}
        <ConversationPanel
          sessionTitle={sessionTitle}
          messages={messages}
          settings={settings}
          chatError={chatError}
          isThinking={isThinking}
          suggestedMemory={suggestedMemory}
          onNewChat={onNewChat}
          onSendMessage={onSendMessage}
          onRetryLastMessage={onRetryLastMessage}
          onDismissChatError={onDismissChatError}
          onSaveSuggestedMemory={onSaveSuggestedMemory}
          onDismissMemorySuggestion={onDismissMemorySuggestion}
        />
      </div>

      {/* Prominent Bottom Voice/Text Input Bar */}
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
        onDismissChatError={onDismissChatError}
        onDismissVoiceError={onDismissVoiceError}
        onToggleListen={onToggleListen}
        onInterrupt={onInterrupt}
        onEndCall={onEndCall}
        onRetryMic={onRetryMic}
        onToggleChatDrawer={onToggleChatDrawer}
        onChangeLanguage={onChangeLanguage}
        draftText={draftText}
        onDraftChange={onDraftChange}
      />
    </div>
  );
};
