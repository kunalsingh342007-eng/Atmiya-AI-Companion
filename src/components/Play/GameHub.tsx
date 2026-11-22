import React, { useState } from 'react';
import { GameId, GameProgress } from '../../types/companion';
import { MemoryMatchGame } from './MemoryMatchGame';
import { QuickQuizGame } from './QuickQuizGame';
import { PatternMatchGame } from './PatternMatchGame';
import { Award, Brain, Gamepad2, HelpCircle, Home, Play, Sparkles } from 'lucide-react';

interface GameHubProps {
  progress: GameProgress;
  soundEnabled: boolean;
  prefersReducedMotion: boolean;
  onCompleteGame: (params: {
    gameId: GameId;
    gameTitle: string;
    score: number;
    xpReward: number;
  }) => void;
  onReturnHome: () => void;
}

const GAMES: {
  id: GameId;
  title: string;
  subtitle: string;
  xpLabel: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'memory-match',
    title: 'Memory Match',
    subtitle: 'Flip cozy cards and match all 6 pairs at your own pace.',
    xpLabel: '+25 XP per completion',
    accent:
      'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-500/35 text-blue-600 dark:text-sky-300',
    icon: Brain,
  },
  {
    id: 'quick-quiz',
    title: 'Quick Quiz',
    subtitle: '5 friendly general-knowledge questions with instant facts.',
    xpLabel: '+15 to +30 XP per round',
    accent:
      'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-500/35 text-sky-600 dark:text-sky-300',
    icon: HelpCircle,
  },
  {
    id: 'pattern-match',
    title: 'Pattern Match',
    subtitle: 'Watch and repeat glowing symbol sequences across 4 rounds.',
    xpLabel: '+25 XP per completion',
    accent:
      'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-500/35 text-indigo-600 dark:text-indigo-300',
    icon: Sparkles,
  },
];

export const GameHub: React.FC<GameHubProps> = ({
  progress,
  soundEnabled,
  prefersReducedMotion,
  onCompleteGame,
  onReturnHome,
}) => {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  if (activeGame === 'memory-match') {
    return (
      <MemoryMatchGame
        soundEnabled={soundEnabled}
        prefersReducedMotion={prefersReducedMotion}
        onComplete={(score, xpReward) =>
          onCompleteGame({
            gameId: 'memory-match',
            gameTitle: 'Memory Match',
            score,
            xpReward,
          })
        }
        onBackToHub={() => setActiveGame(null)}
        onReturnHome={onReturnHome}
      />
    );
  }

  if (activeGame === 'quick-quiz') {
    return (
      <QuickQuizGame
        soundEnabled={soundEnabled}
        prefersReducedMotion={prefersReducedMotion}
        onComplete={(score, xpReward) =>
          onCompleteGame({
            gameId: 'quick-quiz',
            gameTitle: 'Quick Quiz',
            score,
            xpReward,
          })
        }
        onBackToHub={() => setActiveGame(null)}
        onReturnHome={onReturnHome}
      />
    );
  }

  if (activeGame === 'pattern-match') {
    return (
      <PatternMatchGame
        soundEnabled={soundEnabled}
        prefersReducedMotion={prefersReducedMotion}
        onComplete={(score, xpReward) =>
          onCompleteGame({
            gameId: 'pattern-match',
            gameTitle: 'Pattern Match',
            score,
            xpReward,
          })
        }
        onBackToHub={() => setActiveGame(null)}
        onReturnHome={onReturnHome}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 dark:bg-gradient-to-b dark:from-[#070d1a] dark:via-[#0b162d] dark:to-[#070d1a] px-4 sm:px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Summary */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-500/35 text-blue-600 dark:text-sky-300 flex items-center justify-center shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Play Together
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Offline-ready mini-games to relax and unlock cozy room themes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-blue-700 dark:text-sky-300 tabular-nums">
              {progress.xp} XP
            </span>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">·</span>
            <span className="tabular-nums">{progress.gamesCompleted} played</span>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              {progress.achievements.length} badges
            </span>
            <button
              type="button"
              onClick={onReturnHome}
              className="h-9 px-3 rounded-xl bg-white dark:bg-[#0c1528] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Companion</span>
            </button>
          </div>
        </header>

        {/* Mini-Game Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {GAMES.map((game) => {
            const Icon = game.icon;
            const bestScore = progress.bestScores[game.id];

            return (
              <div
                key={game.id}
                className="rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-5 shadow-xs dark:shadow-xl"
              >
                <div className="space-y-3">
                  <div
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center ${game.accent}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {game.title}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {game.subtitle}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{game.xpLabel}</span>
                    {typeof bestScore === 'number' && (
                      <span className="font-semibold text-blue-700 dark:text-sky-300 tabular-nums">
                        Best {bestScore}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveGame(game.id)}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Play {game.title}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fair Progression Note */}
        <div className="rounded-2xl bg-white dark:bg-[#0c1528]/80 border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <span>
            Earn 25 XP to unlock <strong>Indigo Twilight Loft</strong> and 50 XP for{' '}
            <strong>Warm Cream Solarium</strong> in Wardrobe.
          </span>
          <span className="text-slate-500 dark:text-slate-400 tabular-nums">
            Themes unlocked: {progress.unlockedRoomIds.length}/4
          </span>
        </div>
      </div>
    </div>
  );
};
