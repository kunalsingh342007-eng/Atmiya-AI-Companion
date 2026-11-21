import React from 'react';
import { AvatarState } from '../../types/companion';
import { Brain, Hand, MessageSquare, Mic, Sparkles } from 'lucide-react';

interface InteractionControlsProps {
  avatarState: AvatarState;
  memoriesCount: number;
  onTalk: () => void;
  onOpenChat: () => void;
  onInteract: () => void;
  onOpenCustomize: () => void;
  onOpenMemory: () => void;
}

export const InteractionControls: React.FC<InteractionControlsProps> = ({
  avatarState,
  memoriesCount,
  onTalk,
  onOpenChat,
  onInteract,
  onOpenCustomize,
  onOpenMemory,
}) => {
  const isListening = avatarState === 'listening';
  const isBusy = avatarState === 'thinking';

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 flex flex-wrap items-center justify-center md:justify-between gap-2 pointer-events-auto">
      {/* Left Corner Cluster on Desktop: Talk, Chat, Interact */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onTalk}
          disabled={isBusy}
          className={`h-11 sm:h-9 px-3.5 rounded-xl border text-xs font-medium backdrop-blur-md inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
            isListening
              ? 'bg-cyan-600/80 border-cyan-300/60 text-white'
              : 'bg-slate-950/65 hover:bg-slate-900/85 border-white/15 text-slate-100'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{isListening ? 'Send Voice' : 'Talk'}</span>
          <kbd className="hidden md:inline-flex px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-slate-200 font-mono">
            T
          </kbd>
        </button>

        <button
          type="button"
          onClick={onOpenChat}
          className="h-11 sm:h-9 px-3.5 rounded-xl bg-slate-950/65 hover:bg-slate-900/85 border border-white/15 text-slate-100 text-xs font-medium backdrop-blur-md inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Full Chat</span>
          <kbd className="hidden md:inline-flex px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-slate-200 font-mono">
            C
          </kbd>
        </button>

        <button
          type="button"
          onClick={onInteract}
          disabled={isBusy || avatarState === 'speaking'}
          className="h-11 sm:h-9 px-3.5 rounded-xl bg-slate-950/65 hover:bg-slate-900/85 border border-white/15 text-slate-100 text-xs font-medium backdrop-blur-md inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <Hand className="w-3.5 h-3.5 text-amber-300" />
          <span>Greet</span>
          <kbd className="hidden md:inline-flex px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-slate-200 font-mono">
            G
          </kbd>
        </button>
      </div>

      {/* Right Corner Cluster on Desktop: Room & Avatar, Memory */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onOpenCustomize}
          className="h-11 sm:h-9 px-3.5 rounded-xl bg-slate-950/65 hover:bg-slate-900/85 border border-white/15 text-slate-100 text-xs font-medium backdrop-blur-md inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-300" />
          <span>Room & Avatar</span>
        </button>

        <button
          type="button"
          onClick={onOpenMemory}
          className="h-11 sm:h-9 px-3.5 rounded-xl bg-slate-950/65 hover:bg-slate-900/85 border border-white/15 text-slate-100 text-xs font-medium backdrop-blur-md inline-flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <Brain className="w-3.5 h-3.5 text-emerald-300" />
          <span>Memories ({memoriesCount})</span>
        </button>
      </div>
    </div>
  );
};
