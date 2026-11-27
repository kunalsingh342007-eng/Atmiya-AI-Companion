import React, { useMemo, useState } from 'react';
import { ConversationSession } from '../../types/companion';
import { PageHeading, SubpageBackdrop } from '../Layout/CompanionPagePrimitives';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Edit2,
  HardDrive,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

interface HistoryScreenProps {
  conversations: ConversationSession[];
  activeConvId: string | null;
  onResumeSession: (id: string) => void;
  onNewSession: () => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
}

const LANGUAGE_NAMES: Record<string, string> = {
  auto: 'Auto',
  en: 'English',
  hi: 'हिन्दी',
  hinglish: 'Hinglish',
};

function formatDateTime(ts: number): string {
  if (!ts || Number.isNaN(ts)) return '';
  const date = new Date(ts);
  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${timeStr}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeStr}`;
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} · ${timeStr}`;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  conversations,
  activeConvId,
  onResumeSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Only show real sessions containing at least one message
  const nonEmptySessions = useMemo(
    () =>
      [...conversations]
        .filter((c) => Array.isArray(c.messages) && c.messages.length > 0)
        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)),
    [conversations]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSessions = useMemo(
    () =>
      nonEmptySessions.filter((c) => {
        if (!normalizedQuery) return true;
        if ((c.title || '').toLowerCase().includes(normalizedQuery)) return true;
        return c.messages.some((m) => m.content.toLowerCase().includes(normalizedQuery));
      }),
    [nonEmptySessions, normalizedQuery]
  );

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <SubpageBackdrop>
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageHeading
            title="Conversation History"
            subtitle="Resume past conversations or manage transcripts saved on this device"
          />
          <button
            type="button"
            onClick={onNewSession}
            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Search & Clear Bar (Only when sessions exist) */}
        {nonEmptySessions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversation titles or messages..."
                aria-label="Search conversation history"
                className="w-full h-10 pl-10 pr-9 rounded-xl bg-white dark:bg-[#0b132b] border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {!showClearAllConfirm && (
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(true)}
                className="h-10 px-3.5 rounded-xl bg-white dark:bg-[#0b132b] border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/40 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 inline-flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        )}

        {/* Clear All Confirmation */}
        {showClearAllConfirm && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/35 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-100">
            <span className="inline-flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-300 shrink-0" />
              <span>Remove all saved conversations from this browser permanently?</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setShowClearAllConfirm(false);
                }}
                className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
              >
                Delete All
              </button>
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(false)}
                className="h-8 px-3.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty State or Sessions List */}
        {nonEmptySessions.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-[#0b132b] border border-dashed border-slate-300 dark:border-slate-800 px-6 py-14 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                Let&apos;s start with a conversation.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Your conversations with Ātmiya will appear here so you can easily revisit and continue them anytime.
              </p>
            </div>
            <button
              type="button"
              onClick={onNewSession}
              className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition cursor-pointer"
            >
              <span>Start a Conversation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#0b132b] border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No conversations match &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800/80 rounded-2xl bg-white dark:bg-[#0b132b] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {filteredSessions.map((session) => {
              const isCurrent = session.id === activeConvId;
              const isEditing = editingId === session.id;
              const isConfirmingDelete = confirmDeleteId === session.id;
              const lastMessage = session.messages[session.messages.length - 1];
              const previewText = lastMessage?.content?.trim() || '';

              return (
                <article
                  key={session.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2 max-w-md">
                          <input
                            type="text"
                            maxLength={80}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editTitle.trim()) handleSaveRename(session.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            aria-label="Conversation title"
                            className="flex-1 h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-[#060b1c] border border-blue-500 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            autoFocus
                          />
                          <button
                            type="button"
                            disabled={!editTitle.trim()}
                            onClick={() => handleSaveRename(session.id)}
                            aria-label="Save title"
                            className="h-8 w-8 rounded-lg bg-emerald-600 text-white inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            aria-label="Cancel rename"
                            className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                            {session.title || 'Conversation'}
                          </h2>
                          {isCurrent && (
                            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 shrink-0">
                              · Current
                            </span>
                          )}
                        </div>
                      )}

                      {previewText && (
                        <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {lastMessage.role === 'user' ? 'You: ' : 'Ātmiya: '}
                          {previewText}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums pt-0.5">
                        <span>
                          {session.messages.length} message{session.messages.length === 1 ? '' : 's'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateTime(session.updatedAt || session.createdAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{LANGUAGE_NAMES[session.language] || 'Auto'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onResumeSession(session.id)}
                        className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <span>Resume</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteId(null);
                            setEditingId(session.id);
                            setEditTitle(session.title || 'Conversation');
                          }}
                          aria-label={`Rename ${session.title || 'conversation'}`}
                          title="Rename"
                          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center justify-center transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDeleteId((prev) => (prev === session.id ? null : session.id))
                        }
                        aria-label={`Delete ${session.title || 'conversation'}`}
                        title="Delete"
                        className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 inline-flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isConfirmingDelete && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/55 border border-rose-200 dark:border-rose-500/35 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900 dark:text-rose-100">
                      <span>Delete this conversation permanently?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSession(session.id);
                            setConfirmDeleteId(null);
                          }}
                          className="h-7 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="h-7 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Honest Local Storage Note */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 px-1">
          <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Saved locally on this device in browser storage. Clearing browser site data or clicking Clear All removes these transcripts.
          </span>
        </p>
      </div>
    </SubpageBackdrop>
  );
};
