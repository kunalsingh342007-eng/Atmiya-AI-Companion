import React, { useEffect, useState } from 'react';
import {
  AvatarEmotion,
  AvatarState,
  ChatMessage,
  CompanionLanguage,
  CompanionSettings,
  ConversationSession,
  MicPermissionStatus,
  UserProfile,
} from '../../types/companion';
import { CompanionRoom } from '../Room/CompanionRoom';
import { CompanionHUD } from '../HUD/CompanionHUD';
import { AvatarStage } from '../Avatar/AvatarStage';
import {
  AvatarControllerActions,
  AvatarControllerState,
  AvatarGesture,
} from '../Avatar/AvatarController';
import { DialoguePanel } from '../Dialogue/DialoguePanel';
import { InteractionBar } from './InteractionBar';
import { ConversationPanel } from './ConversationPanel';
import { PanelRightOpen, Sparkles, X } from 'lucide-react';

interface HomeScreenProps {
  settings: CompanionSettings;
  profile: UserProfile;
  conversations: ConversationSession[];
  activeConvId: string | null;
  avatarControllerState: AvatarControllerState;
  avatarControllerActions: AvatarControllerActions;
  avatarState: AvatarState;
  companionEmotion: AvatarEmotion;
  previewEmotion: AvatarEmotion | null;
  micPermission: MicPermissionStatus;
  isKeyConfigured: boolean;
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
  onDismissBubble: () => void;
  onDismissHint: () => void;
  onToggleSidebar: () => void;
  onOpenHistoryTab: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewChat: () => void;
  onToggleSound: () => void;
  onToggleTheme: () => void;
  onChangeLanguage: (lang: CompanionLanguage) => void;
  onOpenSettings: () => void;
  onRevisitOnboarding?: () => void;
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
  onQuickReaction: (
    emotion: AvatarEmotion,
    label: string,
    line: string,
    gesture?: AvatarGesture
  ) => void;
  draftText?: string;
  onDraftChange?: (text: string) => void;
  speakingMessageId?: string | null;
  onReplayMessage?: (msg: ChatMessage) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  settings,
  profile,
  conversations,
  activeConvId,
  avatarControllerState,
  avatarControllerActions,
  avatarState,
  companionEmotion,
  previewEmotion,
  micPermission,
  isKeyConfigured,
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
  onDismissBubble,
  onDismissHint,
  onToggleSidebar,
  onOpenHistoryTab,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onNewChat,
  onToggleSound,
  onToggleTheme,
  onChangeLanguage,
  onOpenSettings,
  onRevisitOnboarding,
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
  onQuickReaction,
  draftText,
  onDraftChange,
  speakingMessageId,
  onReplayMessage,
}) => {
  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });
  const [panelTab, setPanelTab] = useState<'overview' | 'chat'>(() =>
    messages.length > 0 ? 'chat' : 'overview'
  );

  // Auto-focus chat tab when a conversation starts or errors appear
  useEffect(() => {
    if (messages.length > 0 || isThinking || chatError) {
      setPanelTab('chat');
    }
  }, [messages.length, isThinking, chatError]);

  const companionName = settings.avatarConfig.personaName?.trim() || 'Ātmiya';

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden">
      {/* Main Central 3D Companion Stage */}
      <div className="flex-1 min-w-0 min-h-0 h-full relative">
        <CompanionRoom
          roomConfig={settings.roomConfig}
          avatarState={avatarState}
          prefersReducedMotion={prefersReducedMotion}
        >
          {/* Full-bleed 3D Avatar Stage */}
          <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
            <AvatarStage
              settings={settings}
              controller={avatarControllerState}
              actions={avatarControllerActions}
              onOpenCustomize={onNavigateWardrobe}
            />
          </div>

          {/* Floating UI Overlay Layer */}
          <div className="relative z-20 flex flex-col h-full w-full justify-between pointer-events-none">
            {/* Top Bar */}
            <div className="pointer-events-auto">
              <CompanionHUD
                settings={settings}
                profile={profile}
                avatarState={avatarState}
                unifiedState={avatarControllerState.unifiedState}
                emotion={previewEmotion ?? companionEmotion}
                micPermission={micPermission}
                isMicMuted={isMicMuted}
                isKeyConfigured={isKeyConfigured}
                onToggleSidebar={onToggleSidebar}
                onOpenHistoryTab={onOpenHistoryTab}
                onToggleSound={onToggleSound}
                onToggleTheme={onToggleTheme}
                onChangeLanguage={onChangeLanguage}
                onOpenSettings={onOpenSettings}
                onRevisitOnboarding={onRevisitOnboarding}
              />
            </div>

            {/* Middle Floating Overlays: Speech Bubble & Right Panel Launcher */}
            <div className="relative flex-1 min-h-0 w-full pointer-events-none">
              {!isDesktopPanelOpen && (
                <button
                  type="button"
                  onClick={() => setIsDesktopPanelOpen(true)}
                  aria-expanded={false}
                  aria-label={`Open workspace and chat with ${companionName}`}
                  title="Open Workspace & Chat"
                  className="pointer-events-auto hidden lg:inline-flex items-center gap-2 absolute right-4 top-1/2 -translate-y-1/2 z-20 px-3.5 py-2.5 rounded-full atmiya-glass-interactive text-[var(--text-primary)] text-xs font-semibold cursor-pointer"
                >
                  <PanelRightOpen className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  <span>Workspace &amp; Chat</span>
                  {messages.length > 0 && (
                    <span className="tabular-nums text-[11px] text-[var(--accent-ink)]">
                      · {messages.length}
                    </span>
                  )}
                </button>
              )}

              {/* Frosted Greeting / Reply Bubble */}
              {speechBubbleText && (
                <div className="pointer-events-none absolute bottom-3 inset-x-0 md:inset-auto md:top-3 md:right-4 lg:right-6 z-20 flex justify-center md:justify-end px-3 md:px-0 atmiya-blur-fade">
                  <div className="pointer-events-auto relative max-w-[min(310px,calc(100vw-1.5rem))] rounded-2xl atmiya-glass-strong text-[var(--text-primary)] px-4 py-3 text-xs sm:text-[13px] font-medium flex items-start gap-2">
                    <span className="leading-snug flex-1 min-w-0 break-words">{speechBubbleText}</span>
                    <button
                      type="button"
                      onClick={onDismissBubble}
                      aria-label="Dismiss speech bubble"
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 -mr-1 -mt-0.5 rounded-lg cursor-pointer shrink-0 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {showFirstTimeHint && !speechBubbleText && (
                <div className="pointer-events-none absolute bottom-3 inset-x-0 z-20 flex justify-center px-3 atmiya-blur-fade">
                  <div className="pointer-events-auto rounded-full atmiya-glass-strong text-[var(--text-primary)] px-3.5 py-1.5 text-[11px] font-medium flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                    <span>Tap {companionName} to greet, or talk &amp; message below</span>
                    <button
                      type="button"
                      onClick={onDismissHint}
                      aria-label="Dismiss hint"
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer rounded transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls + Voice/Text Composer */}
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
                audioLevel={avatarControllerState.audioLevel}
                isChatDrawerOpen={isChatDrawerOpen}
                unreadCount={messages.length}
                language={settings.language}
                onSendMessage={(text) => {
                  setPanelTab('chat');
                  onSendMessage(text);
                }}
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

      {/* Desktop Collapsible Right-Side Companion Workspace (Recent + Quick Actions + Chat) */}
      <ConversationPanel
        sessionTitle={sessionTitle}
        activeConvId={activeConvId}
        conversations={conversations}
        messages={messages}
        settings={settings}
        chatError={chatError}
        isThinking={isThinking}
        isCollapsed={!isDesktopPanelOpen}
        activePanelTab={panelTab}
        onChangePanelTab={setPanelTab}
        onToggleCollapse={() => setIsDesktopPanelOpen((v) => !v)}
        onNewChat={onNewChat}
        onSelectConversation={onSelectConversation}
        onRenameConversation={onRenameConversation}
        onDeleteConversation={onDeleteConversation}
        onOpenAllHistory={onOpenHistoryTab}
        onTalk={onToggleListen}
        onOpenPlay={onNavigatePlay}
        onOpenSettings={onOpenSettings}
        onSendMessage={onSendMessage}
        onRetryLastMessage={onRetryLastMessage}
        onDismissChatError={onDismissChatError}
        speakingMessageId={speakingMessageId}
        onReplayMessage={onReplayMessage}
        prefersReducedMotion={prefersReducedMotion}
      />
    </div>
  );
};
