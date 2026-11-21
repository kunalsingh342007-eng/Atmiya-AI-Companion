import React, { useEffect, useRef, useState } from 'react';
import { playGameSound } from '../../services/gameAudio';
import {
  ArrowLeft,
  CheckCircle2,
  Coffee,
  Compass,
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

interface CardItem {
  uid: number;
  pairId: string;
  label: string;
  accentClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CARD_PAIRS = [
  { pairId: 'lotus', label: 'Lotus', accentClass: 'text-rose-300 border-rose-400/50 bg-rose-950/50', icon: Flower2 },
  { pairId: 'sun', label: 'Sunrise', accentClass: 'text-amber-300 border-amber-400/50 bg-amber-950/50', icon: Sun },
  { pairId: 'moon', label: 'Crescent', accentClass: 'text-indigo-200 border-indigo-400/50 bg-indigo-950/50', icon: Moon },
  { pairId: 'chai', label: 'Chai', accentClass: 'text-orange-200 border-orange-400/50 bg-orange-950/50', icon: Coffee },
  { pairId: 'star', label: 'Spark', accentClass: 'text-sky-200 border-sky-400/50 bg-sky-950/50', icon: Sparkles },
  { pairId: 'compass', label: 'Compass', accentClass: 'text-emerald-200 border-emerald-400/50 bg-emerald-950/50', icon: Compass },
];

function createShuffledDeck(): CardItem[] {
  const deck: CardItem[] = [];
  let uid = 0;
  CARD_PAIRS.forEach((p) => {
    deck.push({ uid: uid++, ...p });
    deck.push({ uid: uid++, ...p });
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface MemoryMatchGameProps {
  soundEnabled: boolean;
  prefersReducedMotion: boolean;
  onComplete: (score: number, xpReward: number) => void;
  onBackToHub: () => void;
  onReturnHome: () => void;
}

export const MemoryMatchGame: React.FC<MemoryMatchGameProps> = ({
  soundEnabled,
  prefersReducedMotion,
  onComplete,
  onBackToHub,
  onReturnHome,
}) => {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'paused' | 'won'>('ready');
  const [deck, setDeck] = useState<CardItem[]>(() => createShuffledDeck());
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportedWinRef = useRef(false);

  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const startNewGame = () => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    reportedWinRef.current = false;
    setDeck(createShuffledDeck());
    setFlippedIndices([]);
    setMatchedPairIds([]);
    setMoves(0);
    setElapsedSeconds(0);
    setIsChecking(false);
    setPhase('playing');
    playGameSound('tap', soundEnabled);
  };

  const handleCardClick = (index: number) => {
    if (phase !== 'playing' || isChecking) return;
    const card = deck[index];
    if (flippedIndices.includes(index) || matchedPairIds.includes(card.pairId)) return;

    playGameSound('flip', soundEnabled);
    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      setIsChecking(true);

      const [firstIdx, secondIdx] = nextFlipped;
      const firstCard = deck[firstIdx];
      const secondCard = deck[secondIdx];

      if (firstCard.pairId === secondCard.pairId) {
        const nextMatched = [...matchedPairIds, firstCard.pairId];
        setMatchedPairIds(nextMatched);
        setFlippedIndices([]);
        setIsChecking(false);
        playGameSound('match', soundEnabled);

        if (nextMatched.length === CARD_PAIRS.length && !reportedWinRef.current) {
          reportedWinRef.current = true;
          const computedScore = Math.max(40, 140 - nextMoves * 5 - Math.floor(elapsedSeconds / 2));
          setPhase('won');
          playGameSound('win', soundEnabled);
          onComplete(computedScore, 25);
        }
      } else {
        checkTimeoutRef.current = setTimeout(() => {
          setFlippedIndices([]);
          setIsChecking(false);
        }, 700);
      }
    }
  };

  const finalScore = Math.max(40, 140 - moves * 5 - Math.floor(elapsedSeconds / 2));

  return (
    <div className="h-full w-full overflow-y-auto px-4 py-5 sm:py-7">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToHub}
            className="h-10 px-3.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-indigo-200/20 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Games</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="tabular-nums font-semibold text-sky-200">
              Pairs {matchedPairIds.length}/{CARD_PAIRS.length}
            </span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="tabular-nums">Moves {moves}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="tabular-nums">{elapsedSeconds}s</span>
          </div>
        </div>

        {/* Game Card Surface */}
        <div className="rounded-3xl bg-slate-900/90 border border-indigo-300/20 p-5 sm:p-6 shadow-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Memory Match</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Flip two cards at a time to pair all 6 cozy symbols.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {phase === 'playing' && (
                <button
                  type="button"
                  onClick={() => setPhase('paused')}
                  className="h-10 px-3.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              )}
              {phase === 'paused' && (
                <button
                  type="button"
                  onClick={() => setPhase('playing')}
                  className="h-10 px-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              )}
              {phase !== 'ready' && (
                <button
                  type="button"
                  onClick={startNewGame}
                  className="h-10 px-3.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>
              )}
            </div>
          </div>

          {phase === 'ready' ? (
            <div className="py-10 px-4 rounded-2xl bg-slate-950/70 border border-indigo-300/15 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/25 border border-indigo-400/40 text-indigo-200 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Ready for a calm focus round?</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Match all 6 pairs to earn +25 XP and unlock achievements. Works completely offline.
                </p>
              </div>
              <button
                type="button"
                onClick={startNewGame}
                className="h-11 px-6 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Start Game</span>
              </button>
            </div>
          ) : phase === 'won' ? (
            <div
              className={`py-8 px-4 rounded-2xl bg-gradient-to-br from-indigo-950/90 via-slate-950 to-violet-950/80 border border-amber-300/35 text-center space-y-4 ${
                prefersReducedMotion ? '' : 'animate-fadeIn'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-300/50 text-amber-200 flex items-center justify-center mx-auto">
                <Trophy className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">All Pairs Matched!</h3>
                <p className="text-xs text-slate-200">
                  Finished in {moves} moves ({elapsedSeconds}s) · Score {finalScore} · +25 XP earned
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={startNewGame}
                  className="h-11 px-5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnHome}
                  className="h-11 px-5 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-100 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Back to Home</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              {phase === 'paused' && (
                <div className="absolute inset-0 z-10 rounded-2xl bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
                  <p className="text-sm font-semibold text-white">Game Paused</p>
                  <button
                    type="button"
                    onClick={() => setPhase('playing')}
                    className="h-10 px-5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume Round</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {deck.map((card, idx) => {
                  const isFlipped = flippedIndices.includes(idx);
                  const isMatched = matchedPairIds.includes(card.pairId);
                  const isRevealed = isFlipped || isMatched;
                  const Icon = card.icon;

                  return (
                    <button
                      key={card.uid}
                      type="button"
                      onClick={() => handleCardClick(idx)}
                      disabled={isRevealed || phase !== 'playing'}
                      aria-label={isRevealed ? `${card.label} card${isMatched ? ' matched' : ''}` : `Hidden card ${idx + 1}`}
                      className={`h-24 sm:h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                        isRevealed
                          ? `${card.accentClass} shadow-md`
                          : 'bg-slate-950/80 hover:bg-indigo-950/60 border-indigo-300/20 hover:border-indigo-300/50 text-slate-400'
                      }`}
                    >
                      {isRevealed ? (
                        <>
                          <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                          <span className="text-[11px] font-semibold tracking-wide flex items-center gap-1">
                            {card.label}
                            {isMatched && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
                          </span>
                        </>
                      ) : (
                        <span className="font-serif text-lg text-indigo-300/60">आ</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
