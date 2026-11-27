import React, { useState } from 'react';
import { GameId, GameProgress } from '../../types/companion';
import { MemoryMatchGame } from './MemoryMatchGame';
import { QuickQuizGame } from './QuickQuizGame';
import { PatternMatchGame } from './PatternMatchGame';
import {
  BackPillButton,
  PageHeading,
  SubpageBackdrop,
} from '../Layout/CompanionPagePrimitives';
import { ArrowRight, Award, Layers, Puzzle } from 'lucide-react';

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
  gradientClass: string;
}[] = [
  {
    id: 'quick-quiz',
    title: 'Math Quiz',
    subtitle: 'Test your skills',
    gradientClass:
      'dark:from-[#26165e]/85 dark:via-[#17164b]/88 dark:to-[#0d143c]/92 dark:border-violet-400/35',
  },
  {
    id: 'memory-match',
    title: 'Memory Game',
    subtitle: 'Remember & Win',
    gradientClass:
      'dark:from-[#12225e]/85 dark:via-[#0f1a4c]/88 dark:to-[#0a1339]/92 dark:border-sky-400/35',
  },
  {
    id: 'pattern-match',
    title: 'Puzzle Game',
    subtitle: 'Solve the puzzle',
    gradientClass:
      'dark:from-[#191d52]/85 dark:via-[#111945]/88 dark:to-[#0a1235]/92 dark:border-indigo-400/35',
  },
];

const MathQuizIconBadge: React.FC = () => (
  <div
    aria-hidden="true"
    className="w-14 h-14 rounded-2xl grid grid-cols-2 gap-1 p-1.5 bg-slate-100 dark:bg-[#101840] border border-slate-200 dark:border-violet-300/25 shadow-inner shrink-0"
  >
    <span className="rounded-md bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
      +
    </span>
    <span className="rounded-md bg-sky-500 text-white text-xs font-bold flex items-center justify-center">
      −
    </span>
    <span className="rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
      ×
    </span>
    <span className="rounded-md bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center">
      ÷
    </span>
  </div>
);

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
            gameTitle: 'Memory Game',
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
            gameTitle: 'Math Quiz',
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
            gameTitle: 'Puzzle Game',
            score,
            xpReward,
          })
        }
        onBackToHub={() => setActiveGame(null)}
        onReturnHome={onReturnHome}
      />
    );
  }

  const renderGameBadge = (id: GameId) => {
    if (id === 'quick-quiz') {
      return <MathQuizIconBadge />;
    }
    if (id === 'memory-match') {
      return (
        <div
          aria-hidden="true"
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 via-indigo-500/20 to-sky-500/15 border border-violet-300/45 dark:border-violet-300/35 flex items-center justify-center shrink-0"
        >
          <Layers className="w-7 h-7 text-violet-600 dark:text-violet-200" />
        </div>
      );
    }
    return (
      <div
        aria-hidden="true"
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 via-orange-400/15 to-indigo-500/15 border border-amber-300/50 dark:border-amber-300/35 flex items-center justify-center shrink-0"
      >
        <Puzzle className="w-7 h-7 text-amber-600 dark:text-amber-300" />
      </div>
    );
  };

  return (
    <SubpageBackdrop>
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 flex flex-col gap-6">
        {/* Top Navigation Back Pill + Progress Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackPillButton label="Back" onClick={onReturnHome} />

          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-indigo-700 dark:text-sky-300 tabular-nums">
              {progress.xp} XP
            </span>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
              ·
            </span>
            <span className="tabular-nums">{progress.gamesCompleted} played</span>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
              ·
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              {progress.achievements.length} badges
            </span>
          </div>
        </div>

        {/* Clean Single-Column Game Hub (No avatar image/panel) */}
        <div className="space-y-5 my-auto py-2">
          <PageHeading
            title="Play & Unwind"
            subtitle="Choose a quick offline mini-game to relax, focus, and earn XP."
          />

          <div className="space-y-3.5">
            {GAMES.map((game) => {
              const bestScore = progress.bestScores[game.id];
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setActiveGame(game.id)}
                  className={`group w-full p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] dark:bg-gradient-to-r ${game.gradientClass} border border-slate-200 hover:border-indigo-400 dark:hover:border-sky-300/65 shadow-xs dark:shadow-[0_14px_34px_rgba(3,8,28,0.55)] hover:shadow-md dark:hover:shadow-[0_16px_38px_rgba(79,70,229,0.3)] flex items-center gap-4 text-left transition duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                >
                  {renderGameBadge(game.id)}

                  <div className="min-w-0 flex-1">
                    <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {game.title}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300/90 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{game.subtitle}</span>
                      {typeof bestScore === 'number' && (
                        <>
                          <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
                            ·
                          </span>
                          <span className="text-indigo-700 dark:text-sky-300 font-semibold tabular-nums">
                            Best {bestScore}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-sky-300/80 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>
              Earn XP in mini-games to unlock cozy rooms in Settings → Appearance.
            </span>
            <span className="tabular-nums">
              Rooms unlocked: {progress.unlockedRoomIds.length}/4
            </span>
          </div>
        </div>
      </div>
    </SubpageBackdrop>
  );
};
