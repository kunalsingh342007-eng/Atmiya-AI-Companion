import React, { useState } from 'react';
import { playGameSound } from '../../services/gameAudio';
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Home,
  Play,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  fact: string;
}

const QUIZ_BANK: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'Which planet in our solar system is known for its prominent icy ring system?',
    options: ['Mars', 'Saturn', 'Venus', 'Mercury'],
    correctIndex: 1,
    fact: 'Saturn has the brightest, most extensive ring system made of ice and rock particles.',
  },
  {
    id: 'q2',
    prompt: 'In classical Indian music, how many primary swaras (notes) form an octave (Saptak)?',
    options: ['5', '7', '9', '12'],
    correctIndex: 1,
    fact: 'The seven swaras are Sa, Re, Ga, Ma, Pa, Dha, and Ni.',
  },
  {
    id: 'q3',
    prompt: 'Which gas makes up roughly 78% of Earth’s atmosphere?',
    options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'],
    correctIndex: 2,
    fact: 'Earth’s atmosphere is about 78% nitrogen and 21% oxygen.',
  },
  {
    id: 'q4',
    prompt: 'What is the largest ocean on Earth?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
    correctIndex: 3,
    fact: 'The Pacific Ocean covers nearly one-third of Earth’s surface.',
  },
  {
    id: 'q5',
    prompt: 'Which instrument is used to measure atmospheric pressure?',
    options: ['Barometer', 'Hygrometer', 'Anemometer', 'Thermometer'],
    correctIndex: 0,
    fact: 'A barometer tracks air pressure changes to help forecast weather.',
  },
  {
    id: 'q6',
    prompt: 'Who wrote the famous collection of poems "Gitanjali"?',
    options: ['Munshi Premchand', 'Rabindranath Tagore', 'Sarojini Naidu', 'Mirza Ghalib'],
    correctIndex: 1,
    fact: 'Rabindranath Tagore won the 1913 Nobel Prize in Literature for Gitanjali.',
  },
  {
    id: 'q7',
    prompt: 'Which mathematical constant represents the ratio of a circle’s circumference to its diameter?',
    options: ['Euler’s e', 'Golden Ratio φ', 'Pi (π)', 'Tau (τ)'],
    correctIndex: 2,
    fact: 'Pi (π ≈ 3.14159) is constant for every circle regardless of size.',
  },
  {
    id: 'q8',
    prompt: 'Which part of a plant primarily absorbs water and minerals from soil?',
    options: ['Roots', 'Leaves', 'Petals', 'Stomata'],
    correctIndex: 0,
    fact: 'Root hairs increase surface area to absorb water and dissolved nutrients.',
  },
];

function pickQuizRound(): QuizQuestion[] {
  const copy = [...QUIZ_BANK];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 5);
}

interface QuickQuizGameProps {
  soundEnabled: boolean;
  prefersReducedMotion: boolean;
  onComplete: (score: number, xpReward: number) => void;
  onBackToHub: () => void;
  onReturnHome: () => void;
}

export const QuickQuizGame: React.FC<QuickQuizGameProps> = ({
  soundEnabled,
  prefersReducedMotion,
  onComplete,
  onBackToHub,
  onReturnHome,
}) => {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'won'>('ready');
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => pickQuizRound());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const startQuiz = () => {
    setQuestions(pickQuizRound());
    setCurrentIdx(0);
    setSelectedOption(null);
    setCorrectCount(0);
    setPhase('playing');
    playGameSound('tap', soundEnabled);
  };

  const currentQuestion = questions[currentIdx];

  const handleSelectOption = (optIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optIdx);
    const isCorrect = optIdx === currentQuestion.correctIndex;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      playGameSound('correct', soundEnabled);
    } else {
      playGameSound('wrong', soundEnabled);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      const score = correctCount * 20;
      const xpReward = 15 + correctCount * 3;
      setPhase('won');
      playGameSound('win', soundEnabled);
      onComplete(score, xpReward);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      playGameSound('tap', soundEnabled);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto px-4 py-5 sm:py-7">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToHub}
            className="h-10 px-3.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-indigo-200/20 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Games</span>
          </button>

          {phase === 'playing' && (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-sky-200 tabular-nums">
                Question {currentIdx + 1}/{questions.length}
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="tabular-nums">Correct {correctCount}</span>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-slate-900/90 border border-indigo-300/20 p-5 sm:p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Quick Quiz</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                5 short general-knowledge questions with instant explanations.
              </p>
            </div>
            {phase !== 'ready' && (
              <button
                type="button"
                onClick={startQuiz}
                className="h-10 px-3.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-semibold text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart</span>
              </button>
            )}
          </div>

          {phase === 'ready' ? (
            <div className="py-10 px-4 rounded-2xl bg-slate-950/70 border border-indigo-300/15 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-300/40 text-sky-200 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Test your curiosity</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Answer 5 quick questions across science, culture, and everyday facts. No timers, no pressure.
                </p>
              </div>
              <button
                type="button"
                onClick={startQuiz}
                className="h-11 px-6 rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Start Quiz</span>
              </button>
            </div>
          ) : phase === 'won' ? (
            <div
              className={`py-8 px-4 rounded-2xl bg-gradient-to-br from-indigo-950/90 via-slate-950 to-sky-950/80 border border-amber-300/35 text-center space-y-4 ${
                prefersReducedMotion ? '' : 'animate-fadeIn'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-300/50 text-amber-200 flex items-center justify-center mx-auto">
                <Trophy className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">Quiz Complete!</h3>
                <p className="text-xs text-slate-200">
                  You answered {correctCount} out of {questions.length} correctly · Score {correctCount * 20} · +{15 + correctCount * 3} XP
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={startQuiz}
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
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300"
                  style={{ width: `${((currentIdx + (selectedOption !== null ? 1 : 0)) / questions.length) * 100}%` }}
                />
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/75 border border-indigo-200/15 space-y-4">
                <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                  {currentQuestion.prompt}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQuestion.options.map((opt, idx) => {
                    const isPicked = selectedOption === idx;
                    const isCorrect = idx === currentQuestion.correctIndex;
                    const revealed = selectedOption !== null;

                    let cardStyle =
                      'bg-slate-900/90 hover:bg-indigo-950/70 border-indigo-200/20 text-slate-100';
                    if (revealed) {
                      if (isCorrect) {
                        cardStyle = 'bg-emerald-950/80 border-emerald-400/70 text-emerald-100';
                      } else if (isPicked) {
                        cardStyle = 'bg-rose-950/80 border-rose-400/70 text-rose-100';
                      } else {
                        cardStyle = 'bg-slate-900/50 border-white/10 text-slate-400';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(idx)}
                        disabled={revealed}
                        className={`min-h-[48px] px-4 py-3 rounded-2xl border text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-2 transition cursor-pointer disabled:cursor-default ${cardStyle}`}
                      >
                        <span>{opt}</span>
                        {revealed && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                        )}
                        {revealed && isPicked && !isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedOption !== null && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-300/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                    <p className="text-xs text-slate-200 leading-relaxed">{currentQuestion.fact}</p>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="h-10 px-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      {currentIdx + 1 >= questions.length ? 'Finish Round' : 'Next Question'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
