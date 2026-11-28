import React, { useEffect, useState } from 'react';
import { ConversationSession } from '../../types/companion';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  X,
  AlertTriangle,
} from 'lucide-react';

interface ConversationSidebarProps {
  conversations: ConversationSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onClose: () => void;
}

function formatSessionTime(ts: number): string {
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

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onClearAll,
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId) {
          setEditingId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, editingId, onClose]);

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const filtered = conversations.filter((c) => {
    if (!normalizedQuery) return true;
    const inTitle = c.title.toLowerCase().includes(normalizedQuery);
    const inMessages = c.messages.some((m) =>
      m.content.toLowerCase().includes(normalizedQuery)
    );
    return inTitle || inMessages;
  });

  const handleStartRename = (c: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleRequestDelete = (conv: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    if (conv.messages.length === 0) {
      onDeleteChat(conv.id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId((prev) => (prev === conv.id ? null : conv.id));
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-stone-950/45 dark:bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Slide-Over Sessions Drawer */}
      <aside
        role="dialog"
        aria-modal={isOpen ? 'true' : undefined}
        aria-label="Conversation sessions"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-[var(--bg-surface)] border-r border-[var(--border-hairline)] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Top Branding / Header */}
        <div className="px-4 py-3.5 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] dark:hidden flex items-center justify-center shrink-0">
              <span className="font-display text-sm text-[var(--accent-ink)]" aria-hidden="true">
                आ
              </span>
            </div>
            <img
              src="/assets/branding/atmiya-logo.png"
              alt=""
              aria-hidden="true"
              className="hidden dark:block w-8 h-8 rounded-xl object-contain bg-[var(--bg-surface)] p-0.5 border border-[var(--border-hairline)] shrink-0"
            />
            <div>
              <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)] block">
                Sessions
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block -mt-0.5 tabular-nums">
                {conversations.length} saved locally
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sessions drawer"
            className="h-9 w-9 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setConfirmDeleteId(null);
              onNewChat();
              onClose();
            }}
            className="w-full min-h-[42px] flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search titles or messages..."
              aria-label="Search conversation sessions"
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-xl pl-8 pr-8 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="absolute right-2 top-1.5 h-6 w-6 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2.5 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 px-3 text-xs text-[var(--text-muted)] space-y-2">
              <p>No matching sessions found.</p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-[var(--accent-ink)] font-semibold hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = conv.id === activeId;
              const isEditing = editingId === conv.id;
              const isConfirmingDelete = confirmDeleteId === conv.id;
              const timeLabel = formatSessionTime(conv.updatedAt || conv.createdAt);

              return (
                <div key={conv.id} className="space-y-1">
                  <div
                    className={`group relative flex items-center justify-between gap-1 p-1.5 rounded-xl transition text-xs ${
                      isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)] border border-[var(--accent-border)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-transparent'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 min-w-0 flex-1 px-1 py-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
                          }`}
                        />
                        <input
                          type="text"
                          maxLength={80}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editTitle.trim()) handleSaveRename(conv.id, e);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          aria-label="Session title"
                          className="bg-[var(--bg-input)] border border-[var(--accent-primary)] rounded px-2 py-1 text-xs text-[var(--text-primary)] w-full focus:outline-none"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          onSelect(conv.id);
                          onClose();
                        }}
                        aria-current={isActive ? 'true' : undefined}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left px-1.5 py-1 rounded-lg cursor-pointer"
                      >
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate block text-[var(--text-primary)]" title={conv.title}>
                              {conv.title || 'Untitled Session'}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-semibold text-[var(--accent-ink)] shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-normal text-[var(--text-muted)] tabular-nums">
                            {conv.messages.length} msg{conv.messages.length === 1 ? '' : 's'}
                            {timeLabel ? ` · ${timeLabel}` : ''}
                          </span>
                        </div>
                      </button>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={!editTitle.trim()}
                            onClick={(e) => handleSaveRename(conv.id, e)}
                            className="h-8 w-8 inline-flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                            title="Save rename"
                            aria-label="Save conversation title"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(null);
                            }}
                            className="h-8 w-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg cursor-pointer"
                            title="Cancel rename"
                            aria-label="Cancel rename"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(conv, e)}
                          className="h-8 w-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg cursor-pointer"
                          title="Rename"
                          aria-label={`Rename ${conv.title || 'conversation'}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleRequestDelete(conv, e)}
                        className="h-8 w-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer"
                        title="Delete"
                        aria-label={`Delete ${conv.title || 'conversation'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isConfirmingDelete && (
                    <div className="mx-1 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/80 flex items-center justify-between gap-2 text-[11px] text-rose-800 dark:text-rose-200">
                      <span className="truncate font-medium">Delete this session?</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteChat(conv.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Clear All Confirmation */}
        <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[var(--border-hairline)]">
          {showClearConfirm ? (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 space-y-2">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                Clear all sessions?
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setShowClearConfirm(false);
                    setConfirmDeleteId(null);
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                >
                  Yes, Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            conversations.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="w-full min-h-[38px] flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All Sessions</span>
              </button>
            )
          )}
        </div>
      </aside>
    </>
  );
};
