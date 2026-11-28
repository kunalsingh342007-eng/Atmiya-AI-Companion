import React, { useEffect, useRef, useState } from 'react';
import { playGameSound } from '../../services/gameAudio';
import { SubpageBackdrop } from '../Layout/CompanionPagePrimitives';
import {
  ArrowLeft,
  Flower2,
  Home,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Trophy,
} from 'lucide-react';

const PADS = [
  {
    id: 0,
    label: 'Navy Moon',
    sound: 'pad0' as const,
    idleClass:
      'bg-blue-50 dark:bg-blue-950/75 border-blue-300 dark:border-blue-500/40 text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/80',
    litClass:
      'bg-blue-600 border-blue-200 text-white shadow-[0_0_24px_rgba(37,99,235,0.65)] scale-[1.02]',
    icon: Moon,
  },
  {
    id: 1,
    label: 'Coral Sun',
    sound: 'pad1' as const,
    idleClass:
      'bg-rose-50 dark:bg-rose-950/75 border-rose-300 dark:border-rose-400/40 text-rose-900 dark:text-rose-100 hover:bg-rose-100 dark:hover:bg-rose-900/75',
    litClass:
      'bg-rose-500 border-rose-200 text-white shadow-[0_0_24px_rgba(244,63,94,0.65)] scale-[1.02]',
    icon: Sun,
  },
  {
    id: 2,
    label: 'Sky Spark',
    sound: 'pad2' as const,
    idleClass:
      'bg-sky-50 dark:bg-sky-950/75 border-sky-300 dark:border-sky-400/40 text-sky-900 dark:text-sky-100 hover:bg-sky-100 dark:hover:bg-sky-900/80',
    litClass:
      'bg-sky-500 border-sky-200 text-white shadow-[0_0_24px_rgba(14,165,233,0.65)] scale-[1.02]',
    icon: Sparkles,
  },
  {
    id: 3,
    label: 'Indigo Lotus',
    sound: 'pad3' as const,
    idleClass:
      'bg-indigo-50 dark:bg-indigo-950/75 border-indigo-300 dark:border-indigo-400/40 text-indigo-900 dark:text-indigo-100 hover:bg-indigo-100 dark:hover:bg-indigo-900/80',
    litClass:
      'bg-indigo-500 border-indigo-200 text-white shadow-[0_0_24px_rgba(99,102,241,0.65)] scale-[1.02]',
    icon: Flower2,
  },
];

const TOTAL_ROUNDS = 4;

interface PatternMatchGameProps {
  soundEnabled: boolean;
  prefersReducedMotion: boolean;
  onComplete: (score: number, xpReward: number) => void;
  onBackToHub: () => void;
  onReturnHome: () => void;
}

export const PatternMatchGame: React.FC<PatternMatchGameProps> = ({
  soundEnabled,
  prefersReducedMotion,
  onComplete,
  onBackToHub,
  onReturnHome,
}) => {
  const [phase, setPhase] = useState<'ready' | 'showing' | 'input' | 'paused' | 'won' | 'missed'>(
    'ready'
  );
  const [sequence, setSequence] = useState<number[]>([]);
  const [inputStep, setInputStep] = useState(0);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [completedRounds, setCompletedRounds] = useState(0);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const playSequence = (seq: number[]) => {
    clearTimers();
    setPhase('showing');
    setActivePad(null);

    seq.forEach((padId, idx) => {
      const startAt = 380 + idx * 620;
      const t1 = setTimeout(() => {
        setActivePad(padId);
        playGameSound(PADS[padId].sound, soundEnabled);
      }, startAt);
      const t2 = setTimeout(() => {
        setActivePad(null);
      }, startAt + 360);
      timersRef.current.push(t1, t2);
    });

    const endAt = 380 + seq.length * 620 + 80;
    const tDone = setTimeout(() => {
      setActivePad(null);
      setInputStep(0);
      setPhase('input');
    }, endAt);
    timersRef.current.push(tDone);
  };

  const startGame = () => {
    clearTimers();
    const initial = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)];
    setSequence(initial);
    setCompletedRounds(0);
    setInputStep(0);
    playSequence(initial);
  };

  const handlePadClick = (padId: number) => {
    if (phase !== 'input') return;

    setActivePad(padId);
    playGameSound(PADS[padId].sound, soundEnabled);
    const clearLit = setTimeout(() => setActivePad(null), 220);
    timersRef.current.push(clearLit);

    if (sequence[inputStep] !== padId) {
      playGameSound('wrong', soundEnabled);
      setPhase('missed');
      return;
    }

    const nextStep = inputStep + 1;
    setInputStep(nextStep);

    if (nextStep >= sequence.length) {
      const nextCompleted = completedRounds + 1;
      setCompletedRounds(nextCompleted);

      if (nextCompleted >= TOTAL_ROUNDS) {
        setPhase('won');
        playGameSound('win', soundEnabled);
        onComplete(100, 25);
      } else {
        const nextSeq = [...sequence, Math.floor(Math.random() * 4)];
        setSequence(nextSeq);
        const pauseBeforeShow = setTimeout(() => {
          playSequence(nextSeq);
        }, 550);
        timersRef.current.push(pauseBeforeShow);
      }
    }
  };

  return (
    <SubpageBackdrop>
      <div className="max-w-2xl w-full mx-auto px-4 py-5 sm:py-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              clearTimers();
              onBackToHub();
            }}
            className="h-10 px-3.5 rounded-xl atmiya-card hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Games</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--accent-ink)] tabular-nums">
              Round {Math.min(completedRounds + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
            </span>
            <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
            <span className="tabular-nums">Length {sequence.length || 2}</span>
          </div>
        </div>

        <div className="rounded-2xl atmiya-card p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                Pattern Match
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Watch the glowing sequence and repeat it in order across {TOTAL_ROUNDS} rounds.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(phase === 'showing' || phase === 'input') && (
                <button
                  type="button"
                  onClick={() => {
                    clearTimers();
                    setActivePad(null);
                    setPhase('paused');
                  }}
                  className="h-10 px-3.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              )}
              {phase === 'paused' && (
                <button
                  type="button"
                  onClick={() => playSequence(sequence)}
                  className="h-10 px-3.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              )}
              {phase !== 'ready' && (
                <button
                  type="button"
                  onClick={startGame}
                  className="h-10 px-3.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>
              )}
            </div>
          </div>

          {phase === 'ready' ? (
            <div className="py-10 px-4 rounded-2xl atmiya-card-subtle text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  Train visual rhythm &amp; recall
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  Each pad has a unique symbol, color, and gentle chime. Complete {TOTAL_ROUNDS} rounds for +25 XP.
                </p>
              </div>
              <button
                type="button"
                onClick={startGame}
                className="h-11 px-6 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Start Sequence</span>
              </button>
            </div>
          ) : phase === 'won' ? (
            <div
              className={`py-8 px-4 rounded-2xl bg-[var(--accent-soft)] border border-amber-400/45 text-center space-y-4 ${
                prefersReducedMotion ? '' : 'animate-fadeIn'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/50 text-[var(--accent-warm)] flex items-center justify-center mx-auto">
                <Trophy className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  Pattern Mastered!
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Completed all {TOTAL_ROUNDS} sequence rounds · Score 100 · +25 XP earned
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={startGame}
                  className="h-11 px-5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnHome}
                  className="h-11 px-5 rounded-xl atmiya-card hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Back to Companion</span>
                </button>
              </div>
            </div>
          ) : phase === 'missed' ? (
            <div className="py-8 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-400/35 text-center space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Almost there!</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  You cleared {completedRounds} of {TOTAL_ROUNDS} rounds. Want to replay the current pattern or restart?
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => playSequence(sequence)}
                  className="h-10 px-4 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold cursor-pointer"
                >
                  Replay Pattern
                </button>
                <button
                  type="button"
                  onClick={startGame}
                  className="h-10 px-4 rounded-xl atmiya-card hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer"
                >
                  Restart Fresh
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 relative">
              <div className="text-center text-xs font-semibold">
                {phase === 'showing' ? (
                  <span className="text-[var(--accent-warm)]">
                    Watch the sequence carefully...
                  </span>
                ) : phase === 'paused' ? (
                  <span className="text-[var(--text-secondary)]">
                    Paused — press Resume to replay this round
                  </span>
                ) : (
                  <span className="text-[var(--accent-ink)] tabular-nums">
                    Your turn ({inputStep}/{sequence.length})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto">
                {PADS.map((pad) => {
                  const Icon = pad.icon;
                  const isLit = activePad === pad.id;
                  return (
                    <button
                      key={pad.id}
                      type="button"
                      disabled={phase !== 'input'}
                      onClick={() => handlePadClick(pad.id)}
                      className={`h-28 sm:h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition cursor-pointer disabled:cursor-default ${
                        isLit ? pad.litClass : pad.idleClass
                      }`}
                    >
                      <Icon className="w-7 h-7" />
                      <span className="text-xs font-semibold tracking-wide">{pad.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </SubpageBackdrop>
  );
};
