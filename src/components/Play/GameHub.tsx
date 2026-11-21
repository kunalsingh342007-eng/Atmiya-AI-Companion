import React, { useState } from 'react';
import { GameId, GameProgress } from '../../types/companion';
import { MemoryMatchGame } from './MemoryMatchGame';
import { QuickQuizGame } from './QuickQuizGame';
import { PatternMatchGame } from './PatternMatchGame';
import { Award, Brain, Gamepad2, HelpCircle, Play, Sparkles } from 'lucide-react';

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
    accent: 'from-indigo-600/25 to-violet-600/20 border-indigo-300/30 text-indigo-200',
    icon: Brain,
  },
  {
    id: 'quick-quiz',
    title: 'Quick Quiz',
    subtitle: '5 friendly general-knowledge questions with instant facts.',
    xpLabel: '+15 to +30 XP per round',
    accent: 'from-sky-600/25 to-indigo-600/20 border-sky-300/30 text-sky-200',
    icon: HelpCircle,
  },
  {
    id: 'pattern-match',
    title: 'Pattern Match',
    subtitle: 'Watch and repeat glowing symbol sequences across 4 rounds.',
    xpLabel: '+25 XP per completion',
    accent: 'from-rose-600/20 to-violet-600/25 border-rose-300/30 text-rose-200',
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
    <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/35 to-slate-950 px-4 sm:px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Summary */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/25 border border-indigo-400/35 text-indigo-200 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Play Together
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                Offline-ready mini-games to relax and unlock cozy room themes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-200">
            <span className="font-semibold text-amber-200 tabular-nums">{progress.xp} XP</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="tabular-nums">{progress.gamesCompleted} played</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Award className="w-3.5 h-3.5 text-sky-300" />
              {progress.achievements.length} badges
            </span>
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
                className="rounded-3xl bg-slate-900/85 border border-indigo-300/20 p-5 flex flex-col justify-between gap-5 shadow-xl"
              >
                <div className="space-y-3">
                  <div
                    className={`w-11 h-11 rounded-2xl border bg-gradient-to-br flex items-center justify-center ${game.accent}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-white">{game.title}</h2>
                    <p className="text-xs text-slate-300 leading-relaxed">{game.subtitle}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>{game.xpLabel}</span>
                    {typeof bestScore === 'number' && (
                      <span className="font-semibold text-sky-200 tabular-nums">
                        Best {bestScore}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveGame(game.id)}
                    className="w-full h-11 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Play {game.title}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fair Progression Transparency Note */}
        <div className="rounded-2xl bg-slate-900/60 border border-white/10 px-4 py-3 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <span>
            Earn 25 XP to unlock <strong>Indigo Twilight Loft</strong> and 50 XP for{' '}
            <strong>Warm Cream Solarium</strong> in Wardrobe.
          </span>
          <span className="text-slate-400">
            Themes unlocked: {progress.unlockedRoomIds.length}/4
          </span>
        </div>
      </div>
    </div>
  );
};
