import React, { useState } from 'react';
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
          className="fixed inset-0 z-40 bg-slate-950/50 dark:bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Slide-Over Sessions Drawer */}
      <aside
        role="dialog"
        aria-modal={isOpen ? 'true' : undefined}
        aria-label="Conversation sessions"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-white dark:bg-[#091224] border-r border-slate-200 dark:border-slate-800/80 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Top Branding / Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0f2347] to-blue-600 flex items-center justify-center shadow-sm font-serif font-bold text-white text-base">
              आ
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white block">
                Sessions{' '}
                <span className="font-normal text-xs text-blue-600 dark:text-sky-400 font-serif">
                  बातचीत
                </span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block -mt-0.5 tabular-nums">
                {conversations.length} saved locally
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sessions drawer"
            className="h-9 w-9 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
            className="w-full min-h-[42px] flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation (नई बातचीत)</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search titles or messages..."
              aria-label="Search conversation sessions"
              className="w-full bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="absolute right-2 top-1.5 h-6 w-6 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2.5 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 px-3 text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <p>No matching sessions found.</p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 dark:text-sky-300 font-semibold hover:underline cursor-pointer"
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
                    onClick={() => {
                      if (isEditing) return;
                      setConfirmDeleteId(null);
                      onSelect(conv.id);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    aria-current={isActive ? 'true' : undefined}
                    onKeyDown={(e) => {
                      if (isEditing) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setConfirmDeleteId(null);
                        onSelect(conv.id);
                        onClose();
                      }
                    }}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-200 border border-blue-200 dark:border-blue-500/40 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive
                            ? 'text-blue-600 dark:text-sky-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitle}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') handleSaveRename(conv.id, e);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          aria-label="Session title"
                          className="bg-white dark:bg-slate-900 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-slate-900 dark:text-slate-100 w-full focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate block" title={conv.title}>
                              {conv.title || 'Untitled Session'}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-sky-300 shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 tabular-nums">
                            {conv.messages.length} msg{conv.messages.length === 1 ? '' : 's'}
                            {timeLabel ? ` · ${timeLabel}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleSaveRename(conv.id, e)}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded cursor-pointer"
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
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                            title="Cancel rename"
                            aria-label="Cancel rename"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(conv, e)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                          title="Rename"
                          aria-label={`Rename ${conv.title || 'conversation'}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleRequestDelete(conv, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                        title="Delete"
                        aria-label={`Delete ${conv.title || 'conversation'}`}
                      >
                        <Trash2 className="w-3 h-3" />
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
                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
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
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
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
                  className="flex-1 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
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
                className="w-full min-h-[36px] flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear History (इतिहास साफ करें)</span>
              </button>
            )
          )}
        </div>
      </aside>
    </>
  );
};
