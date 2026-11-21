import React, { useState } from 'react';
import { UserMemory, MemoryCategory } from '../../types/companion';
import {
  Brain,
  Trash2,
  Edit3,
  Plus,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Calendar,
  Tag,
  MessageSquareOff,
} from 'lucide-react';

interface MemoriesScreenProps {
  memories: UserMemory[];
  memoryEnabled: boolean;
  conversationsCount: number;
  onToggleMemoryEnabled: (enabled: boolean) => void;
  onAddMemory: (memory: Omit<UserMemory, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateMemory: (id: string, updates: Partial<UserMemory>) => void;
  onDeleteMemory: (id: string) => void;
  onClearAllMemories: () => void;
  onClearAllConversations: () => void;
}

const CATEGORIES: { label: string; value: MemoryCategory; desc: string }[] = [
  { label: 'Preference (पसंद/शैली)', value: 'preference', desc: 'Communication style or behavioral preferences' },
  { label: 'Language (भाषा प्राथमिकता)', value: 'language', desc: 'Preferred speaking and writing languages' },
  { label: 'Project (परियोजना)', value: 'project', desc: 'Current software, robotics, or study projects' },
  { label: 'Learning Goal (सीखने का लक्ष्य)', value: 'learning_goal', desc: 'Topics, exams, or skills you are mastering' },
  { label: 'Fact (व्यक्तिगत तथ्य)', value: 'fact', desc: 'Explicitly approved background facts' },
  { label: 'Custom (अन्य)', value: 'custom', desc: 'General notes' },
];

export const MemoriesScreen: React.FC<MemoriesScreenProps> = ({
  memories,
  memoryEnabled,
  conversationsCount,
  onToggleMemoryEnabled,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onClearAllMemories,
  onClearAllConversations,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('fact');

  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preference');

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false);

  const handleStartEdit = (m: UserMemory) => {
    setEditingId(m.id);
    setEditContent(m.content);
    setEditCategory(m.category);
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

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/35 to-slate-950 px-4 sm:px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-950/80 border border-violet-500/35 text-violet-300 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Ātmiya’s Memory (व्यक्तिगत स्मृति)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Transparent, user-approved facts stored locally on your device.
              </p>
            </div>
          </div>
        </header>

        {/* Master Memory Toggle */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-300/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck
              className={`w-5 h-5 shrink-0 ${memoryEnabled ? 'text-emerald-400' : 'text-slate-500'}`}
            />
            <div>
              <div className="text-sm font-semibold text-slate-100">
                {memoryEnabled
                  ? 'Memory System Active (स्मृति सक्रिय)'
                  : 'Memory System Disabled (स्मृति निष्क्रिय)'}
              </div>
              <div className="text-xs text-slate-400">
                {memoryEnabled
                  ? 'Ātmiya references the approved memories below to personalize conversations.'
                  : 'Ātmiya treats every session fresh without retrieving saved memories.'}
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={memoryEnabled}
            aria-label="Toggle memory system"
            onClick={() => onToggleMemoryEnabled(!memoryEnabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
              memoryEnabled ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                memoryEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-violet-400" />
            <span>Saved Memories ({memories.length})</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="h-10 px-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Fact</span>
              </button>
            )}
            {memories.length > 0 && !showClearConfirm && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="h-10 px-4 rounded-full bg-slate-900 hover:bg-rose-950/70 border border-white/15 hover:border-rose-400/40 text-xs font-semibold text-slate-200 hover:text-rose-200 inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Memories</span>
              </button>
            )}
            {conversationsCount > 0 && !showClearChatsConfirm && (
              <button
                type="button"
                onClick={() => setShowClearChatsConfirm(true)}
                className="h-10 px-4 rounded-full bg-slate-900 hover:bg-rose-950/70 border border-white/15 hover:border-rose-400/40 text-xs font-semibold text-slate-200 hover:text-rose-200 inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <MessageSquareOff className="w-3.5 h-3.5" />
                <span>Clear Chats</span>
              </button>
            )}
          </div>
        </div>

        {/* Confirmations */}
        {showClearConfirm && (
          <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-700/70 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>Permanently delete all saved memories from local storage?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearAllMemories();
                  setShowClearConfirm(false);
                }}
                className="h-9 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-semibold cursor-pointer"
              >
                Yes, Delete All
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="h-9 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showClearChatsConfirm && (
          <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-700/70 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>Clear all saved conversation transcripts on this browser?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearAllConversations();
                  setShowClearChatsConfirm(false);
                }}
                className="h-9 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-semibold cursor-pointer"
              >
                Yes, Clear Chats
              </button>
              <button
                type="button"
                onClick={() => setShowClearChatsConfirm(false)}
                className="h-9 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Memory Form */}
        {isAdding && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-400/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-200">
              <span>Add User-Approved Memory</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} - {c.desc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fact or Preference</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="e.g. I prefer concise Hinglish answers and enjoy evening quizzes."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-400 h-20"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="h-9 px-3.5 rounded-full text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNew}
                disabled={!newContent.trim()}
                className="h-9 px-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                Save Memory
              </button>
            </div>
          </div>
        )}

        {/* Memory Cards */}
        <div className="space-y-2.5">
          {memories.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-800 text-slate-400">
              <Brain className="w-10 h-10 mx-auto mb-2 opacity-40 text-violet-400" />
              <p className="text-sm font-medium text-slate-300">No memories saved yet.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                When you share preferences in conversation, Ātmiya asks your approval before saving them here.
              </p>
            </div>
          ) : (
            memories.map((m) => {
              const isEditing = editingId === m.id;
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-slate-900/85 border border-white/10 space-y-2"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
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
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-400 h-16"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="h-8 px-3 text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(m.id)}
                          className="h-8 px-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-semibold uppercase tracking-wider text-violet-300">
                            {m.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-white/5 transition cursor-pointer"
                            title="Edit memory"
                            aria-label="Edit memory"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMemory(m.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-white/5 transition cursor-pointer"
                            title="Delete memory"
                            aria-label="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">{m.content}</p>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Local Privacy Note */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 text-[11px] text-slate-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
          <span>
            Stored privately in your browser’s localStorage. Microphone audio is processed only when active and never stored permanently.
          </span>
        </div>
      </div>
    </div>
  );
};
