import React, { useState } from 'react';
import { UserMemory, MemoryCategory } from '../../types/companion';
import { 
  Brain, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  AlertTriangle, 
  Sparkles,
  ShieldCheck,
  Calendar,
  Tag
} from 'lucide-react';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: UserMemory[];
  memoryEnabled: boolean;
  onToggleMemoryEnabled: (enabled: boolean) => void;
  onAddMemory: (memory: Omit<UserMemory, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateMemory: (id: string, updates: Partial<UserMemory>) => void;
  onDeleteMemory: (id: string) => void;
  onClearAllMemories: () => void;
}

const CATEGORIES: { label: string; value: MemoryCategory; desc: string }[] = [
  { label: 'Preference (पसंद/शैली)', value: 'preference', desc: 'Communication style or behavioral preferences' },
  { label: 'Language (भाषा प्राथमिकता)', value: 'language', desc: 'Preferred speaking and writing languages' },
  { label: 'Project (परियोजना)', value: 'project', desc: 'Current software, robotics, or study projects' },
  { label: 'Learning Goal (सीखने का लक्ष्य)', value: 'learning_goal', desc: 'Topics, exams, or skills you are mastering' },
  { label: 'Fact (व्यक्तिगत तथ्य)', value: 'fact', desc: 'Explicitly approved background facts' },
  { label: 'Custom (अन्य)', value: 'custom', desc: 'General notes' },
];

export const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  memories,
  memoryEnabled,
  onToggleMemoryEnabled,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onClearAllMemories,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('fact');

  // New memory state
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preference');

  // Confirmation state for clear all
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-950/80 border border-violet-500/30 text-violet-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-wide flex items-center gap-2">
                Ātmiya's Memory (व्यक्तिगत स्मृति प्रणाली)
              </h3>
              <p className="text-xs text-slate-400">
                Transparent, user-controlled memory. Ātmiya only remembers facts you approve.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm px-2.5 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Master Memory Toggle */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className={`w-5 h-5 ${memoryEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
            <div>
              <div className="text-sm font-semibold text-slate-200">
                {memoryEnabled ? 'Memory System Active (स्मृति सक्रिय)' : 'Memory System Disabled (स्मृति निष्क्रिय)'}
              </div>
              <div className="text-xs text-slate-400">
                {memoryEnabled
                  ? 'Ātmiya references the saved memories below to personalize responses.'
                  : 'Ātmiya will treat every session fresh without retrieving persistent memories.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => onToggleMemoryEnabled(!memoryEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              memoryEnabled ? 'bg-violet-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                memoryEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-violet-400" />
            Saved Memories ({memories.length})
          </div>
          <div className="flex items-center gap-2">
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-xs font-semibold text-white transition shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Fact (नया तथ्य जोड़ें)
              </button>
            )}
            {memories.length > 0 && !showClearConfirm && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-xs text-slate-300 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All (सब हटाएं)
              </button>
            )}
          </div>
        </div>

        {/* Clear All Confirmation Modal/Banner */}
        {showClearConfirm && (
          <div className="mt-3 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Are you sure you want to permanently delete all saved memories?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  onClearAllMemories();
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium cursor-pointer"
              >
                Yes, Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add New Memory Form */}
        {isAdding && (
          <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-violet-500/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-violet-300">
              <span>Add User-Approved Memory</span>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category:</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} - {c.desc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fact / Preference details:</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="e.g. I am preparing for a C++ interview and prefer code examples with time complexity explained."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 h-20"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNew}
                disabled={!newContent.trim()}
                className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                Save Memory
              </button>
            </div>
          </div>
        )}

        {/* Memory List */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {memories.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 text-slate-500">
              <Brain className="w-10 h-10 mx-auto mb-2 opacity-40 text-violet-400" />
              <p className="text-sm font-medium text-slate-400">No memories saved yet.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                When you share preferences like "Remember that I like short answers in Hinglish",
                Ātmiya will ask for your approval before saving it here.
              </p>
            </div>
          ) : (
            memories.map((m) => {
              const isEditing = editingId === m.id;
              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col gap-2"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500 h-16"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(m.id)}
                          className="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white cursor-pointer"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-violet-950 text-violet-300 border border-violet-800/50">
                            {m.category}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(m)}
                            className="p-1 text-slate-400 hover:text-violet-400 transition cursor-pointer"
                            title="Edit memory"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteMemory(m.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-normal">
                        {m.content}
                      </p>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Privacy Note Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Stored safely in local private storage. Passwords or financial details are never saved.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
