import React, { useState } from 'react';
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
import { PanelRightOpen, Sparkles, X } from 'lucide-react';

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
  const [isDesktopChatOpen, setIsDesktopChatOpen] = useState(false);
  const companionName = settings.avatarConfig.personaName?.trim() || 'Ātmiya';

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden">
      {/* Main Central 3D Companion Stage (Room + Full-bleed Avatar + Floating HUD/Pills/Composer) */}
      <div className="flex-1 min-w-0 min-h-0 h-full relative">
        <CompanionRoom
          roomConfig={settings.roomConfig}
          avatarState={avatarState}
          prefersReducedMotion={prefersReducedMotion}
        >
          {/* Full-bleed 3D Avatar Stage extending cleanly behind HUD, Quick Actions & Floating Composer */}
          <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
            <AvatarStage
              settings={settings}
              controller={avatarControllerState}
              actions={avatarControllerActions}
              onOpenCustomize={onNavigateWardrobe}
            />
          </div>

          {/* Floating UI Overlay Layer (pointer-events pass through empty space to 3D avatar orbit/tap) */}
          <div className="relative z-20 flex flex-col h-full w-full justify-between pointer-events-none">
            {/* Top-Right Compact Controls */}
            <div className="pointer-events-auto">
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
            </div>

            {/* Middle Floating Overlays: Speech Bubble & Collapsible Right Chat Handle */}
            <div className="relative flex-1 min-h-0 w-full pointer-events-none">
              {/* Collapsible Right Chat Toggle Tab (md+ when panel is collapsed) */}
              {!isDesktopChatOpen && (
                <button
                  type="button"
                  onClick={() => setIsDesktopChatOpen(true)}
                  aria-expanded={false}
                  aria-label={`Open Chat with ${companionName}`}
                  title={`Open Chat with ${companionName}`}
                  className="pointer-events-auto hidden md:inline-flex items-center gap-2 absolute right-4 top-1/2 -translate-y-1/2 z-20 px-3.5 py-2.5 rounded-full bg-white/90 dark:bg-[#0b1536]/82 hover:bg-white dark:hover:bg-[#132252] border border-slate-200 dark:border-indigo-400/30 text-slate-800 dark:text-slate-100 text-xs font-semibold backdrop-blur-xl shadow-[0_8px_28px_rgba(4,9,28,0.35)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <PanelRightOpen className="w-4 h-4 text-blue-600 dark:text-sky-300 shrink-0" />
                  <span>Chat with {companionName}</span>
                  {messages.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-sky-500/20 text-blue-700 dark:text-sky-200 text-[10px] font-bold tabular-nums">
                      {messages.length}
                    </span>
                  )}
                </button>
              )}

              {/* Frosted Greeting / Reply Bubble (upper-right beside avatar on md+, centered bottom on mobile) */}
              {speechBubbleText && (
                <div className="pointer-events-none absolute bottom-2 inset-x-0 md:inset-auto md:top-[12%] md:right-[6%] lg:right-[10%] xl:right-[14%] z-20 flex justify-center md:justify-end px-3 md:px-0 animate-fadeIn">
                  <div className="pointer-events-auto relative max-w-[270px] sm:max-w-[300px] rounded-2xl bg-white/92 dark:bg-slate-100/88 text-slate-900 px-4 py-3 text-xs sm:text-[13px] font-medium shadow-[0_14px_36px_rgba(4,9,28,0.42)] border border-white/80 backdrop-blur-xl flex items-start gap-2">
                    <span className="leading-snug flex-1">{speechBubbleText}</span>
                    <button
                      type="button"
                      onClick={onDismissBubble}
                      aria-label="Dismiss speech bubble"
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {showFirstTimeHint && !speechBubbleText && (
                <div className="pointer-events-none absolute bottom-2 inset-x-0 z-20 flex justify-center px-3 animate-fadeIn">
                  <div className="pointer-events-auto rounded-full bg-white/94 dark:bg-[#0a1433]/90 border border-slate-200 dark:border-indigo-400/25 text-slate-800 dark:text-sky-100 px-3.5 py-1.5 text-[11px] font-medium shadow-md flex items-center gap-2 backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-300 shrink-0" />
                    <span>Tap {companionName} to greet, or talk &amp; message below</span>
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

            {/* Floating Bottom Action Pills + Translucent Voice/Text Composer */}
            <div className="w-full shrink-0 flex flex-col items-center pointer-events-none">
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
          </div>
        </CompanionRoom>
      </div>

      {/* Desktop Collapsible Right-Side Conversation Panel (md+) */}
      <ConversationPanel
        sessionTitle={sessionTitle}
        messages={messages}
        settings={settings}
        chatError={chatError}
        isThinking={isThinking}
        suggestedMemory={suggestedMemory}
        isCollapsed={!isDesktopChatOpen}
        onToggleCollapse={() => setIsDesktopChatOpen((v) => !v)}
        onNewChat={onNewChat}
        onSendMessage={onSendMessage}
        onRetryLastMessage={onRetryLastMessage}
        onDismissChatError={onDismissChatError}
        onSaveSuggestedMemory={onSaveSuggestedMemory}
        onDismissMemorySuggestion={onDismissMemorySuggestion}
      />
    </div>
  );
};

