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
  suggestedMemory: string | null;
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
  suggestedMemory,
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
  onSaveSuggestedMemory,
  onDismissMemorySuggestion,
  onQuickReaction,
  draftText,
  onDraftChange,
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
                  title={`Open Workspace & Chat`}
                  className="pointer-events-auto hidden lg:inline-flex items-center gap-2 absolute right-4 top-1/2 -translate-y-1/2 z-20 px-3.5 py-2.5 rounded-full bg-white/92 dark:bg-[#0b132b]/86 hover:bg-white dark:hover:bg-[#131f47] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold backdrop-blur-xl shadow-lg transition cursor-pointer"
                >
                  <PanelRightOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
                  <span>Workspace &amp; Chat</span>
                  {messages.length > 0 && (
                    <span className="tabular-nums text-[11px] text-indigo-600 dark:text-indigo-300">
                      · {messages.length}
                    </span>
                  )}
                </button>
              )}

              {/* Frosted Greeting / Reply Bubble */}
              {speechBubbleText && (
                <div className="pointer-events-none absolute bottom-2 inset-x-0 md:inset-auto md:top-[12%] md:right-[6%] lg:right-[8%] z-20 flex justify-center md:justify-end px-3 md:px-0 animate-fadeIn">
                  <div className="pointer-events-auto relative max-w-[270px] sm:max-w-[300px] rounded-2xl bg-white/94 dark:bg-slate-100/92 text-slate-900 px-4 py-3 text-xs sm:text-[13px] font-medium shadow-xl border border-white/80 backdrop-blur-xl flex items-start gap-2">
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
                  <div className="pointer-events-auto rounded-full bg-white/94 dark:bg-[#0b132b]/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-3.5 py-1.5 text-[11px] font-medium shadow-md flex items-center gap-2 backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300 shrink-0" />
                    <span>Tap {companionName} to greet, or talk &amp; message below</span>
                    <button
                      type="button"
                      onClick={onDismissHint}
                      aria-label="Dismiss hint"
                      className="text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white cursor-pointer"
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
        suggestedMemory={suggestedMemory}
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
        onSaveSuggestedMemory={onSaveSuggestedMemory}
        onDismissMemorySuggestion={onDismissMemorySuggestion}
      />
    </div>
  );
};
