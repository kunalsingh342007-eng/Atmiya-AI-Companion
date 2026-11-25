import React, { useEffect, useMemo, useState } from 'react';
import {
  ConversationSession,
  MemoryCategory,
  UserMemory,
} from '../../types/companion';
import {
  BackPillButton,
  PageHeading,
  SubpageBackdrop,
} from '../Layout/CompanionPagePrimitives';
import eveningRoomImg from '../../assets/images/cozy_companion_room_evening_1795280662566.jpg';
import dayRoomImg from '../../assets/images/cozy_companion_room_day_1795280663394.jpg';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Calendar,
  Edit3,
  Gamepad2,
  MessageSquareOff,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

interface MemoriesScreenProps {
  memories: UserMemory[];
  memoryEnabled: boolean;
  conversationsCount: number;
  conversations?: ConversationSession[];
  onToggleMemoryEnabled: (enabled: boolean) => void;
  onAddMemory: (memory: Omit<UserMemory, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateMemory: (id: string, updates: Partial<UserMemory>) => void;
  onDeleteMemory: (id: string) => void;
  onClearAllMemories: () => void;
  onClearAllConversations: () => void;
  onUnsavedChange?: (hasUnsaved: boolean) => void;
}

const CATEGORIES: { label: string; value: MemoryCategory; desc: string }[] = [
  { label: 'Preference (पसंद/शैली)', value: 'preference', desc: 'Communication style or behavioral preferences' },
  { label: 'Language (भाषा प्राथमिकता)', value: 'language', desc: 'Preferred speaking and writing languages' },
  { label: 'Project (परियोजना)', value: 'project', desc: 'Current software, robotics, or study projects' },
  { label: 'Learning Goal (सीखने का लक्ष्य)', value: 'learning_goal', desc: 'Topics, exams, or skills you are mastering' },
  { label: 'Fact (व्यक्तिगत तथ्य)', value: 'fact', desc: 'Explicitly approved background facts' },
  { label: 'Custom (अन्य)', value: 'custom', desc: 'General notes' },
];

const CATEGORY_TITLES: Record<MemoryCategory, string> = {
  preference: 'Companion Preference',
  language: 'Language Style',
  project: 'Creative Project',
  learning_goal: 'Learning Moment',
  fact: 'Personal Note',
  custom: 'Saved Moment',
};

function formatMemoryDate(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function summarizeMemoryTitle(content: string, fallback: string): string {
  const cleaned = content.trim().replace(/\s+/g, ' ');
  if (!cleaned) return fallback;
  if (cleaned.length <= 28) return cleaned;
  return `${cleaned.slice(0, 26).trim()}…`;
}

const MemoryVisualArtwork: React.FC<{
  variant: 'chat' | 'learning' | 'game';
}> = ({ variant }) => {
  if (variant === 'chat') {
    return (
      <div className="relative w-full h-36 sm:h-40 rounded-xl overflow-hidden bg-slate-900">
        <img
          src={dayRoomImg}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-85"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#081029]/85 via-transparent to-sky-400/15"
        />
        <div className="absolute bottom-2.5 left-2.5 w-8 h-8 rounded-lg bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
          <Sparkles className="w-4 h-4 text-sky-200" />
        </div>
      </div>
    );
  }

  if (variant === 'learning') {
    return (
      <div className="relative w-full h-36 sm:h-40 rounded-xl overflow-hidden bg-[#060d2b]">
        <svg
          viewBox="0 0 320 180"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="mem-space-bg" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </radialGradient>
            <linearGradient id="mem-planet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <rect width="320" height="180" fill="url(#mem-space-bg)" />
          <circle cx="48" cy="36" r="1.5" fill="#e0f2fe" />
          <circle cx="115" cy="24" r="1.2" fill="#bae6fd" />
          <circle cx="268" cy="38" r="1.8" fill="#fde68a" />
          <circle cx="290" cy="112" r="1.4" fill="#c4b5fd" />
          <circle cx="42" cy="128" r="1.4" fill="#bae6fd" />
          <circle cx="72" cy="64" r="18" fill="#f59e0b" fillOpacity="0.88" />
          <ellipse cx="72" cy="64" rx="34" ry="8" fill="none" stroke="#38bdf8" strokeWidth="2.5" transform="rotate(-14 72 64)" />
          <circle cx="195" cy="108" r="34" fill="url(#mem-planet)" />
          <ellipse cx="195" cy="108" rx="68" ry="15" fill="none" stroke="#38bdf8" strokeWidth="3" strokeOpacity="0.85" transform="rotate(-16 195 108)" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-full h-36 sm:h-40 rounded-xl overflow-hidden bg-gradient-to-br from-[#1d2d66] via-[#2b2968] to-[#1a1847] flex items-center justify-center">
      <img
        src={eveningRoomImg}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-35 blur-[2px]"
      />
      <div
        aria-hidden="true"
        className="relative z-10 w-24 h-16 rounded-2xl bg-gradient-to-br from-emerald-300/90 via-sky-300/90 to-violet-400/95 shadow-[0_14px_30px_rgba(30,41,59,0.5)] flex items-center justify-center border border-white/40"
      >
        <Gamepad2 className="w-9 h-9 text-slate-900/85" />
      </div>
    </div>
  );
};

export const MemoriesScreen: React.FC<MemoriesScreenProps> = ({
  memories,
  memoryEnabled,
  conversationsCount,
  conversations = [],
  onToggleMemoryEnabled,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onClearAllMemories,
  onClearAllConversations,
  onUnsavedChange,
}) => {
  const [viewMode, setViewMode] = useState<'highlights' | 'all'>('highlights');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('fact');

  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preference');

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);

  const hasUnsavedDraft =
    (isAdding && newContent.trim().length > 0) ||
    (editingId !== null && editContent.trim().length > 0);

  useEffect(() => {
    onUnsavedChange?.(hasUnsavedDraft);
    return () => onUnsavedChange?.(false);
  }, [hasUnsavedDraft, onUnsavedChange]);

  const handleStartEdit = (m: UserMemory) => {
    setConfirmDeleteId(null);
    setEditingId(m.id);
    setEditContent(m.content);
    setEditCategory(m.category);
    setViewMode('all');
  };

  const handleSaveEdit = (id: string) => {
    if (!editContent.trim()) return;
    onUpdateMemory(id, {
      content: editContent.trim(),
      category: editCategory,
    });
    setEditingId(null);
  };

  const handleSaveNew = () => {
    if (!newContent.trim()) return;
    onAddMemory({
      content: newContent.trim(),
      category: newCategory,
      approvedByUser: true,
    });
    setNewContent('');
    setIsAdding(false);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMemories = memories.filter((m) => {
    const matchesCat = categoryFilter === 'all' || m.category === categoryFilter;
    const matchesText =
      !normalizedQuery ||
      m.content.toLowerCase().includes(normalizedQuery) ||
      m.category.toLowerCase().includes(normalizedQuery);
    return matchesCat && matchesText;
  });

  const hasActiveFilter = Boolean(normalizedQuery) || categoryFilter !== 'all';

  // Build up to 3 visual highlight cards strictly from real memories & real non-empty sessions
  const highlightCards = useMemo(() => {
    type HighlightCard =
      | {
          kind: 'memory';
          id: string;
          title: string;
          dateLabel: string;
          subtitle: string;
          variant: 'chat' | 'learning' | 'game';
          borderGlow: string;
          memory: UserMemory;
        }
      | {
          kind: 'session';
          id: string;
          title: string;
          dateLabel: string;
          subtitle: string;
          variant: 'chat' | 'learning' | 'game';
          borderGlow: string;
        };

    const cards: HighlightCard[] = [];
    const glowCycle = [
      'dark:border-sky-400/55 dark:hover:border-sky-300',
      'dark:border-blue-400/55 dark:hover:border-blue-300',
      'dark:border-violet-400/55 dark:hover:border-violet-300',
    ];

    memories.slice(0, 3).forEach((m, idx) => {
      const variant: 'chat' | 'learning' | 'game' =
        m.category === 'learning_goal' || m.category === 'project'
          ? 'learning'
          : m.category === 'custom'
          ? 'game'
          : idx === 1
          ? 'learning'
          : 'chat';

      cards.push({
        kind: 'memory',
        id: m.id,
        title: summarizeMemoryTitle(m.content, CATEGORY_TITLES[m.category]),
        dateLabel: formatMemoryDate(m.updatedAt || m.createdAt),
        subtitle: m.content,
        variant,
        borderGlow: glowCycle[idx % glowCycle.length],
        memory: m,
      });
    });

    if (cards.length < 3) {
      const activeSessions = conversations.filter((c) => c.messages.length > 0);
      for (const session of activeSessions) {
        if (cards.length >= 3) break;
        const idx = cards.length;
        cards.push({
          kind: 'session',
          id: session.id,
          title: summarizeMemoryTitle(session.title, 'Companion Chat'),
          dateLabel: formatMemoryDate(session.updatedAt || session.createdAt),
          subtitle: `${session.messages.length} messages exchanged`,
          variant: idx === 1 ? 'learning' : 'game',
          borderGlow: glowCycle[idx % glowCycle.length],
        });
      }
    }

    return cards;
  }, [memories, conversations]);

  return (
    <SubpageBackdrop>
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col justify-center gap-6">
        {/* Header Row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            {viewMode === 'all' && (
              <BackPillButton
                label="Back to Highlights"
                onClick={() => setViewMode('highlights')}
              />
            )}
            <PageHeading
              title="My Memories"
              subtitle="Cherished moments with Ātmiya"
            />
          </div>

          {/* Memory System Toggle */}
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-[#091332]/88 border border-slate-200 dark:border-indigo-400/28 shadow-xs">
            <ShieldCheck
              className={`w-4 h-4 shrink-0 ${
                memoryEnabled
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {memoryEnabled ? 'Memory Active' : 'Memory Paused'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={memoryEnabled}
              aria-label="Toggle memory system"
              onClick={() => onToggleMemoryEnabled(!memoryEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                memoryEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                  memoryEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Highlights Showcase View (Matches Reference Composition) */}
        {viewMode === 'highlights' && (
          <div className="space-y-7 my-auto">
            {highlightCards.length === 0 ? (
              <div className="rounded-3xl bg-white dark:bg-[#091332]/85 border border-dashed border-slate-300 dark:border-indigo-400/35 px-6 py-12 text-center space-y-3 shadow-xs">
                <Brain className="w-10 h-10 mx-auto text-blue-500 dark:text-sky-300 opacity-75" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  No memories saved yet
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Share preferences in conversation or add a personal note so Ātmiya remembers what matters to you.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('all');
                    setIsAdding(true);
                  }}
                  className="h-10 px-5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Your First Memory</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {highlightCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      if (card.kind === 'memory') {
                        handleStartEdit(card.memory);
                      } else {
                        setViewMode('all');
                      }
                    }}
                    className={`group rounded-2xl p-2.5 bg-white dark:bg-[#091332]/88 border border-slate-200 ${card.borderGlow} shadow-xs dark:shadow-[0_16px_38px_rgba(3,8,28,0.58)] hover:shadow-lg transition text-left cursor-pointer flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`}
                  >
                    <MemoryVisualArtwork variant={card.variant} />
                    <div className="px-2 pt-3 pb-2 space-y-1">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {card.title}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-300/80 tabular-nums">
                        {card.dateLabel}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 pt-0.5 leading-relaxed">
                        {card.subtitle}
                      </p>
                    </div>
                  </button>
                ))}

                {/* If user has 1 or 2 real memories, offer a clean + Add slot so row stays balanced without faking data */}
                {highlightCards.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('all');
                      setIsAdding(true);
                    }}
                    className="rounded-2xl p-6 bg-white/75 dark:bg-[#091332]/55 border border-dashed border-slate-300 dark:border-indigo-400/35 hover:border-blue-500 dark:hover:border-sky-300/60 flex flex-col items-center justify-center text-center gap-2.5 min-h-[228px] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-indigo-500/20 border border-blue-200 dark:border-indigo-400/30 flex items-center justify-center text-blue-600 dark:text-sky-300">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-white">
                      Add a Memory
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 max-w-[180px]">
                      Save a preference, project, or study goal locally
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Centered Purple View All Memories CTA */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className="h-11 px-7 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-[0_10px_28px_rgba(99,102,241,0.45)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <span>View All Memories</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Full Memory Vault View (Search, Filter, Add, Edit, Delete, Clear) */}
        {viewMode === 'all' && (
          <div className="space-y-4">
            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                <span className="tabular-nums">
                  Saved Memories ({hasActiveFilter ? `${filteredMemories.length}/${memories.length}` : memories.length})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!isAdding && (
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Fact</span>
                  </button>
                )}
                {memories.length > 0 && !showClearConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="h-10 px-4 rounded-xl bg-white dark:bg-[#091332] hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-slate-200 dark:border-indigo-400/25 hover:border-rose-300 dark:hover:border-rose-500/40 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-200 inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Memories</span>
                  </button>
                )}
                {conversationsCount > 0 && !showClearChatsConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowClearChatsConfirm(true)}
                    className="h-10 px-4 rounded-xl bg-white dark:bg-[#091332] hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-slate-200 dark:border-indigo-400/25 hover:border-rose-300 dark:hover:border-rose-500/40 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-200 inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquareOff className="w-3.5 h-3.5" />
                    <span>Clear Chats</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Search Row */}
            {memories.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-7 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search saved memories..."
                    aria-label="Search saved memories"
                    className="w-full h-10 bg-white dark:bg-[#091332] border border-slate-200 dark:border-indigo-400/25 rounded-xl pl-9 pr-8 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear memory search"
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="sm:col-span-5">
                  <select
                    aria-label="Filter memories by category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as MemoryCategory | 'all')}
                    className="w-full h-10 bg-white dark:bg-[#091332] border border-slate-200 dark:border-indigo-400/25 rounded-xl px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">All categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Confirmations */}
            {showClearConfirm && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-700/70 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-300 shrink-0" />
                  <span>Permanently delete all saved memories from local storage?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllMemories();
                      setShowClearConfirm(false);
                    }}
                    className="h-9 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Yes, Delete All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="h-9 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showClearChatsConfirm && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-700/70 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-300 shrink-0" />
                  <span>Clear all saved conversation transcripts on this browser?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllConversations();
                      setShowClearChatsConfirm(false);
                    }}
                    className="h-9 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Yes, Clear Chats
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearChatsConfirm(false)}
                    className="h-9 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Add Memory Form */}
            {isAdding && (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#091332] border border-blue-300 dark:border-sky-400/45 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-sky-200">
                  <span>Add User-Approved Memory</span>
                  <button
                    type="button"
                    aria-label="Close add memory form"
                    onClick={() => setIsAdding(false)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                    className="w-full bg-slate-50 dark:bg-[#060d24] border border-slate-200 dark:border-indigo-400/25 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label} - {c.desc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Fact or Preference
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="e.g. I prefer concise Hinglish answers and enjoy evening quizzes."
                    className="w-full bg-slate-50 dark:bg-[#060d24] border border-slate-200 dark:border-indigo-400/25 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 h-20"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setNewContent('');
                    }}
                    className="h-9 px-3.5 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNew}
                    disabled={!newContent.trim()}
                    className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Save Memory
                  </button>
                </div>
              </div>
            )}

            {/* Memory List */}
            <div className="space-y-2.5">
              {memories.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-indigo-400/25 text-slate-500 dark:text-slate-400">
                  <Brain className="w-10 h-10 mx-auto mb-2 opacity-40 text-blue-500 dark:text-sky-400" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No memories saved yet.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    When you share preferences in conversation, Ātmiya asks your approval before saving them here.
                  </p>
                </div>
              ) : filteredMemories.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-indigo-400/25 text-slate-500 dark:text-slate-400 space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No memories match your current search or category filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-sky-300 hover:underline cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                filteredMemories.map((m) => {
                  const isEditing = editingId === m.id;
                  const isConfirmingDelete = confirmDeleteId === m.id;
                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#091332]/90 border border-slate-200 dark:border-indigo-400/25 space-y-2 shadow-xs"
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                            className="bg-slate-50 dark:bg-[#060d24] border border-slate-200 dark:border-indigo-400/25 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#060d24] border border-slate-200 dark:border-indigo-400/25 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 h-16"
                          />
                          {!editContent.trim() && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400">
                              Memory text cannot be empty.
                            </p>
                          )}
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="h-8 px-3 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={!editContent.trim()}
                              onClick={() => handleSaveEdit(m.id)}
                              className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-white cursor-pointer"
                            >
                              Update
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="font-semibold text-blue-700 dark:text-sky-300">
                                {CATEGORY_TITLES[m.category]}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Calendar className="w-3 h-3" />
                                {formatMemoryDate(m.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(m)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                                title="Edit memory"
                                aria-label="Edit memory"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDeleteId((prev) => (prev === m.id ? null : m.id))
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                                title="Delete memory"
                                aria-label="Delete memory"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                            {m.content}
                          </p>

                          {isConfirmingDelete && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-rose-700 dark:text-rose-300 font-medium">
                                Remove this memory permanently?
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteMemory(m.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="h-7 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="h-7 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Local Privacy Note */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#091332]/70 border border-slate-200 dark:border-indigo-400/20 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
              <span>
                Stored privately in your browser’s localStorage. Microphone audio is processed only when active and never stored permanently.
              </span>
            </div>
          </div>
        )}
      </div>
    </SubpageBackdrop>
  );
};
