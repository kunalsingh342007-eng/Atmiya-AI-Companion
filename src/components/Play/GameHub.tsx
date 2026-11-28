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
import { BlurFade } from '../Motion/CompanionMotion';
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
  accentTint: string;
}[] = [
  {
    id: 'quick-quiz',
    title: 'Math Quiz',
    subtitle: 'Test your skills',
    accentTint:
      'hover:border-[var(--accent-border)] dark:bg-gradient-to-r dark:from-[#1b1a42]/90 dark:via-[#121833]/92 dark:to-[#0f1628]/95',
  },
  {
    id: 'memory-match',
    title: 'Memory Game',
    subtitle: 'Remember & Win',
    accentTint:
      'hover:border-[var(--accent-border)] dark:bg-gradient-to-r dark:from-[#122246]/90 dark:via-[#101a34]/92 dark:to-[#0d1527]/95',
  },
  {
    id: 'pattern-match',
    title: 'Puzzle Game',
    subtitle: 'Solve the puzzle',
    accentTint:
      'hover:border-[var(--accent-border)] dark:bg-gradient-to-r dark:from-[#1a1f3d]/90 dark:via-[#121933]/92 dark:to-[#0f1526]/95',
  },
];

const MathQuizIconBadge: React.FC = () => (
  <div
    aria-hidden="true"
    className="w-14 h-14 rounded-2xl grid grid-cols-2 gap-1 p-1.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] shadow-inner shrink-0"
  >
    <span className="rounded-md bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
      +
    </span>
    <span className="rounded-md bg-sky-500 text-white text-xs font-bold flex items-center justify-center">
      −
    </span>
    <span className="rounded-md bg-[var(--accent-primary)] text-white text-xs font-bold flex items-center justify-center">
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
          className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center shrink-0"
        >
          <Layers className="w-7 h-7 text-[var(--accent-ink)]" />
        </div>
      );
    }
    return (
      <div
        aria-hidden="true"
        className="w-14 h-14 rounded-2xl bg-amber-500/12 dark:bg-amber-400/15 border border-amber-500/30 flex items-center justify-center shrink-0"
      >
        <Puzzle className="w-7 h-7 text-[var(--accent-warm)]" />
      </div>
    );
  };

  return (
    <SubpageBackdrop>
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 flex flex-col gap-6">
        {/* Top Navigation Back Pill + Progress Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackPillButton label="Back" onClick={onReturnHome} />

          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--accent-ink)] tabular-nums">
              {progress.xp} XP
            </span>
            <span aria-hidden="true" className="text-[var(--text-muted)]">
              ·
            </span>
            <span className="tabular-nums">{progress.gamesCompleted} played</span>
            <span aria-hidden="true" className="text-[var(--text-muted)]">
              ·
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Award className="w-3.5 h-3.5 text-[var(--accent-warm)]" />
              {progress.achievements.length} badges
            </span>
          </div>
        </div>

        {/* Clean Single-Column Game Hub */}
        <div className="space-y-5 my-auto py-2">
          <PageHeading
            title="Play & Unwind"
            subtitle="Choose a quick offline mini-game to relax, focus, and earn XP."
          />

          <div className="space-y-3.5">
            {GAMES.map((game, idx) => {
              const bestScore = progress.bestScores[game.id];
              return (
                <BlurFade key={game.id} delayMs={idx * 45}>
                  <button
                    type="button"
                    onClick={() => setActiveGame(game.id)}
                    className={`group w-full p-4 sm:p-5 rounded-2xl atmiya-card ${game.accentTint} shadow-xs hover:shadow-md flex items-center gap-4 text-left transition duration-200 cursor-pointer`}
                  >
                    {renderGameBadge(game.id)}

                    <div className="min-w-0 flex-1">
                      <div className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                        {game.title}
                      </div>
                      <div className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{game.subtitle}</span>
                        {typeof bestScore === 'number' && (
                          <>
                            <span aria-hidden="true" className="text-[var(--text-muted)]">
                              ·
                            </span>
                            <span className="text-[var(--accent-ink)] font-semibold tabular-nums">
                              Best {bestScore}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                </BlurFade>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)] pt-1">
            <span>
              Earn XP in mini-games to unlock cozy rooms in Settings → Appearance.
            </span>
            <span className="tabular-nums font-medium">
              Rooms unlocked: {progress.unlockedRoomIds.length}/4
            </span>
          </div>
        </div>
      </div>
    </SubpageBackdrop>
  );
};
