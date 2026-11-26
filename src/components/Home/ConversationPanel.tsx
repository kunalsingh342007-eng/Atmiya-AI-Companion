import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatMessage,
  CompanionSettings,
  ConversationSession,
} from '../../types/companion';
import { MessageList } from '../Chat/MessageList';
import { QuickStarters } from '../Chat/QuickStarters';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Edit2,
  Gamepad2,
  History,
  MessageSquare,
  Mic,
  PanelRightClose,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface ConversationPanelProps {
  sessionTitle: string;
  activeConvId: string | null;
  conversations: ConversationSession[];
  messages: ChatMessage[];
  settings: CompanionSettings;
  chatError: string | null;
  isThinking: boolean;
  suggestedMemory: string | null;
  isCollapsed: boolean;
  activePanelTab: 'overview' | 'chat';
  onChangePanelTab: (tab: 'overview' | 'chat') => void;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenAllHistory: () => void;
  onTalk: () => void;
  onOpenPlay: () => void;
  onOpenSettings: () => void;
  onSendMessage: (text: string) => void;
  onRetryLastMessage: () => void;
  onDismissChatError?: () => void;
  onSaveSuggestedMemory: (memoryText: string) => void;
  onDismissMemorySuggestion: () => void;
}

function formatCompactTime(ts: number): string {
  if (!ts || Number.isNaN(ts)) return '';
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  sessionTitle,
  activeConvId,
  conversations,
  messages,
  settings,
  chatError,
  isThinking,
  suggestedMemory,
  isCollapsed,
  activePanelTab,
  onChangePanelTab,
  onToggleCollapse,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onOpenAllHistory,
  onTalk,
  onOpenPlay,
  onOpenSettings,
  onSendMessage,
  onRetryLastMessage,
  onDismissChatError,
  onSaveSuggestedMemory,
  onDismissMemorySuggestion,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const companionName = settings.avatarConfig.personaName?.trim() || 'Ātmiya';
  const userName = settings.userName?.trim();

  const recentRealConversations = useMemo(
    () =>
      [...conversations]
        .filter((c) => Array.isArray(c.messages) && c.messages.length > 0)
        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
        .slice(0, 4),
    [conversations]
  );

  const latestConversation = recentRealConversations[0] ?? null;

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 96;
  };

  useEffect(() => {
    if (!isCollapsed && activePanelTab === 'chat' && shouldStickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isCollapsed, activePanelTab, messages.length, isThinking, suggestedMemory, chatError]);

  if (isCollapsed) {
    return null;
  }

  return (
    <aside
      aria-label="Companion activity and conversation"
      className="hidden lg:flex lg:w-[330px] xl:w-[360px] shrink-0 h-full min-h-0 flex-col bg-white/95 dark:bg-[#080f24]/95 border-l border-slate-200 dark:border-slate-800/80 z-20 animate-fadeIn"
    >
      {/* Top Header + Tabs */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-[#0b132b]">
        <div
          role="tablist"
          aria-label="Workspace panel views"
          className="inline-flex rounded-xl bg-slate-200/70 dark:bg-[#060b1c] p-0.5 border border-slate-200 dark:border-slate-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activePanelTab === 'overview'}
            onClick={() => onChangePanelTab('overview')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activePanelTab === 'overview'
                ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePanelTab === 'chat'}
            onClick={() => onChangePanelTab('chat')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
              activePanelTab === 'chat'
                ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Chat</span>
            {messages.length > 0 && (
              <span className="tabular-nums text-[10px] opacity-80">{messages.length}</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSuggestionsDismissed(false);
              onNewChat();
              onChangePanelTab('chat');
            }}
            aria-label="Start new conversation"
            title="New conversation"
            className="h-8 px-2.5 rounded-lg bg-white dark:bg-[#111b38] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" />
            <span>New</span>
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse right panel"
            title="Collapse panel"
            className="h-8 w-8 rounded-lg bg-white dark:bg-[#111b38] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 inline-flex items-center justify-center transition cursor-pointer"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview Tab: Recent Conversations + 4 Practical Quick Actions */}
      {activePanelTab === 'overview' ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          {/* Recent Conversations */}
          <section aria-label="Recent conversations" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Recent Conversations
              </h2>
              {recentRealConversations.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenAllHistory}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer"
                >
                  View all
                </button>
              )}
            </div>

            {recentRealConversations.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 dark:bg-[#0b132b] border border-dashed border-slate-300 dark:border-slate-700/80 p-5 text-center space-y-3">
                <MessageSquare className="w-6 h-6 mx-auto text-indigo-500 dark:text-indigo-300" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Let&apos;s start with a conversation.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Speak or type below to begin your first session with {companionName}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChangePanelTab('chat')}
                  className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Start Conversation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b132b] overflow-hidden">
                {recentRealConversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  const isEditing = editingId === conv.id;
                  const isConfirming = confirmDeleteId === conv.id;
                  const lastMsg = conv.messages[conv.messages.length - 1];

                  return (
                    <div key={conv.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && editTitle.trim()) {
                                    onRenameConversation(conv.id, editTitle.trim());
                                    setEditingId(null);
                                  }
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                aria-label="Rename conversation"
                                className="flex-1 min-w-0 h-7 px-2 rounded-lg bg-slate-50 dark:bg-[#060b1c] border border-indigo-500 text-xs text-slate-900 dark:text-white"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (editTitle.trim()) {
                                    onRenameConversation(conv.id, editTitle.trim());
                                  }
                                  setEditingId(null);
                                }}
                                aria-label="Save rename"
                                className="h-7 w-7 rounded-lg bg-emerald-600 text-white inline-flex items-center justify-center cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                aria-label="Cancel rename"
                                className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectConversation(conv.id);
                                onChangePanelTab('chat');
                              }}
                              className="w-full text-left group cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate">
                                  {conv.title || 'Conversation'}
                                </span>
                                {isActive && (
                                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 shrink-0">
                                    · Active
                                  </span>
                                )}
                              </div>
                              {lastMsg?.content && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {lastMsg.content}
                                </p>
                              )}
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums mt-0.5">
                                {conv.messages.length} msgs ·{' '}
                                {formatCompactTime(conv.updatedAt || conv.createdAt)}
                              </div>
                            </button>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                setEditingId(conv.id);
                                setEditTitle(conv.title || 'Conversation');
                              }}
                              aria-label={`Rename ${conv.title || 'conversation'}`}
                              title="Rename"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeleteId((prev) => (prev === conv.id ? null : conv.id))
                              }
                              aria-label={`Delete ${conv.title || 'conversation'}`}
                              title="Delete"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isConfirming && (
                        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/35 flex items-center justify-between gap-2 text-[11px] text-rose-900 dark:text-rose-100">
                          <span>Delete conversation?</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteConversation(conv.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick Actions (4 Real Actions) */}
          <section aria-label="Quick actions" className="space-y-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={onTalk}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0b132b] hover:bg-indigo-50/70 dark:hover:bg-[#121d3f] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-left transition cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5 min-w-0">
                  <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    Talk to {companionName}
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (latestConversation) {
                    onSelectConversation(latestConversation.id);
                    onChangePanelTab('chat');
                  } else {
                    onChangePanelTab('chat');
                  }
                }}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0b132b] hover:bg-indigo-50/70 dark:hover:bg-[#121d3f] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-left transition cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5 min-w-0">
                  <History className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {latestConversation
                      ? 'Continue recent conversation'
                      : 'Open chat & starters'}
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={onOpenPlay}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0b132b] hover:bg-indigo-50/70 dark:hover:bg-[#121d3f] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-left transition cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5 min-w-0">
                  <Gamepad2 className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    Play mini-games
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0b132b] hover:bg-indigo-50/70 dark:hover:bg-[#121d3f] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-left transition cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5 min-w-0">
                  <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    Profile &amp; Settings
                  </span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            </div>
          </section>
        </div>
      ) : (
        /* Active Chat Tab */
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3.5 space-y-4"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5 tabular-nums">
            <span className="truncate font-medium">{sessionTitle || 'New Conversation'}</span>
            <span>{messages.length} msg{messages.length === 1 ? '' : 's'}</span>
          </div>

          {messages.length === 0 && !isThinking ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0b132b] border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{userName ? `Namaste, ${userName}` : 'Namaste!'}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  I&apos;m {companionName}. Talk with your microphone or type below to get started.
                </p>
              </div>

              {!suggestionsDismissed ? (
                <QuickStarters
                  compact
                  onSelectPrompt={onSendMessage}
                  onDismiss={() => setSuggestionsDismissed(true)}
                />
              ) : (
                <div className="flex items-center justify-end px-0.5">
                  <button
                    type="button"
                    onClick={() => setSuggestionsDismissed(false)}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer"
                  >
                    Show suggestions
                  </button>
                </div>
              )}
            </div>
          ) : (
            <MessageList
              messages={messages}
              isThinking={isThinking}
              settings={settings}
              onSaveSuggestedMemory={onSaveSuggestedMemory}
              suggestedMemory={suggestedMemory}
              onDismissMemorySuggestion={onDismissMemorySuggestion}
            />
          )}

          {chatError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-500/40 flex items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-200 animate-fadeIn">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">{chatError}</span>
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onRetryLastMessage}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
                {onDismissChatError && (
                  <button
                    type="button"
                    onClick={onDismissChatError}
                    aria-label="Dismiss error"
                    className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}
    </aside>
  );
};
