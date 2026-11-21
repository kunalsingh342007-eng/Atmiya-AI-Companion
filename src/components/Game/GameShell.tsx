import React from 'react';
import { ActiveNavTab } from '../../types/companion';
import { Brain, Gamepad2, Home, Palette, Settings } from 'lucide-react';

interface GameShellProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  memoriesCount: number;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: ActiveNavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'play', label: 'Play', icon: Gamepad2 },
  { id: 'wardrobe', label: 'Wardrobe', icon: Palette },
  { id: 'memories', label: 'Memories', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const GameShell: React.FC<GameShellProps> = ({
  activeTab,
  onSelectTab,
  memoriesCount,
  children,
}) => {
  return (
    <div className="relative flex flex-col h-dvh w-full overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Main Active Screen Content */}
      <div className="flex-1 min-h-0 w-full relative overflow-hidden">
        {children}
      </div>

      {/* Persistent 5-Destination Bottom Navigation */}
      <nav
        aria-label="Main companion navigation"
        className="relative z-30 shrink-0 w-full bg-slate-950/92 border-t border-indigo-300/15 backdrop-blur-xl px-2 sm:px-6 py-1.5"
      >
        <div className="max-w-3xl mx-auto grid grid-cols-5 gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={
                  item.id === 'memories'
                    ? `Memories (${memoriesCount})`
                    : item.label
                }
                className={`min-h-[46px] px-1.5 sm:px-3 py-1.5 rounded-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[11px] sm:text-xs font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-950/50 border border-indigo-300/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-200' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
