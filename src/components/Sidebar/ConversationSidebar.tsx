import React, { useState } from 'react';
import { ConversationSession } from '../../types/companion';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Search, 
  Sparkles, 
  X, 
  AlertTriangle 
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartRename = (c: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Branding / Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-900/40 font-serif font-bold text-white text-base">
              आ
            </div>
            <div>
              <span className="font-semibold text-sm tracking-wide text-white block">
                Ātmiya <span className="font-normal text-xs text-violet-400 font-serif">आत्मीय</span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                AI Companion
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-violet-950/50 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation (नई बातचीत)</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No conversations found.
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = conv.id === activeId;
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelect(conv.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs ${
                    isActive
                      ? 'bg-violet-950/50 text-violet-200 border border-violet-500/40 font-medium'
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-violet-400' : 'text-slate-500'
                      }`}
                    />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitle}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(conv.id, e as any);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="bg-slate-900 border border-violet-500 rounded px-1.5 py-0.5 text-xs text-slate-100 w-full focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate block" title={conv.title}>
                        {conv.title || 'Untitled Session'}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isEditing ? (
                      <button
                        onClick={(e) => handleSaveRename(conv.id, e)}
                        className="p-1 text-emerald-400 hover:text-emerald-300"
                        title="Save rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleStartRename(conv, e)}
                        className="p-1 text-slate-400 hover:text-slate-200"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(conv.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Clear All Confirmation Modal/Button */}
        <div className="p-3 border-t border-slate-800/80">
          {showClearConfirm ? (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-[11px] text-rose-200 space-y-2">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Clear all chats?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onClearAll();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            conversations.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
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
