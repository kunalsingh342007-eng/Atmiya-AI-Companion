import React, { useMemo, useState } from 'react';
import {
  CompanionSettings,
  UserMemory,
} from '../../types/companion';
import { api } from '../../services/api';
import { AvatarShowcasePanel } from '../Avatar/AvatarShowcasePanel';
import {
  BackPillButton,
  PageHeading,
  SubpageBackdrop,
} from '../Layout/CompanionPagePrimitives';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Globe2,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';

type LearningSubjectId = 'science' | 'math' | 'general-knowledge';

interface ConceptQuestion {
  id: string;
  topic: string;
  conceptSummary: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface SubjectDefinition {
  id: LearningSubjectId;
  title: string;
  subtitle: string;
  tutorPromptPlaceholder: string;
  suggestedQuestion: string;
  items: ConceptQuestion[];
}

const SUBJECTS: SubjectDefinition[] = [
  {
    id: 'science',
    title: 'Science',
    subtitle: 'Explore the universe',
    tutorPromptPlaceholder: 'Ask Ātmiya any science question (e.g., Why is the sky blue?)',
    suggestedQuestion: 'Explain how stars produce light and heat in simple terms.',
    items: [
      {
        id: 'sci-gravity',
        topic: 'Space & Orbits',
        conceptSummary:
          'Planets stay in orbit because forward velocity balances the inward pull of the Sun’s gravity.',
        prompt: 'What keeps Earth orbiting around the Sun instead of flying off into deep space?',
        options: [
          'Solar wind pressure',
          'Gravitational attraction balanced by orbital speed',
          'Earth’s magnetic field',
          'Atmospheric friction',
        ],
        correctIndex: 1,
        explanation:
          'Gravity pulls Earth toward the Sun while Earth’s sideways speed keeps it continually curving around in orbit.',
      },
      {
        id: 'sci-photosynthesis',
        topic: 'Living Systems',
        conceptSummary:
          'Plants convert sunlight, water, and carbon dioxide into glucose and oxygen inside chloroplasts.',
        prompt: 'Which gas do green plants release as a byproduct during photosynthesis?',
        options: ['Nitrogen', 'Carbon monoxide', 'Oxygen', 'Methane'],
        correctIndex: 2,
        explanation:
          'Chlorophyll captures light energy to split water molecules, releasing oxygen gas into the air.',
      },
      {
        id: 'sci-light',
        topic: 'Physics of Light',
        conceptSummary:
          'Shorter wavelengths of sunlight (blue/violet) scatter much more strongly off air molecules than red light.',
        prompt: 'Why does a clear daytime sky appear blue from Earth’s surface?',
        options: [
          'Oceans reflect their blue color onto clouds',
          'Shorter blue wavelengths scatter more across atmospheric gases',
          'Nitrogen gas itself glows bright blue',
          'Sunlight contains only blue rays at noon',
        ],
        correctIndex: 1,
        explanation:
          'Rayleigh scattering deflects shorter blue wavelengths in all directions as sunlight enters Earth’s atmosphere.',
      },
    ],
  },
  {
    id: 'math',
    title: 'Math',
    subtitle: 'Solve & Learn',
    tutorPromptPlaceholder: 'Ask Ātmiya to explain a math concept or check a problem...',
    suggestedQuestion: 'Teach me an easy mental trick for finding percentages quickly.',
    items: [
      {
        id: 'math-percent',
        topic: 'Percentages',
        conceptSummary:
          'Finding 10% moves the decimal left one place; 15% is simply 10% plus half of 10%.',
        prompt: 'What is 15% of 240?',
        options: ['24', '32', '36', '42'],
        correctIndex: 2,
        explanation: '10% of 240 is 24, and half of 24 (5%) is 12. Adding 24 + 12 gives 36.',
      },
      {
        id: 'math-ratio',
        topic: 'Geometry & Angles',
        conceptSummary:
          'The interior angles of any Euclidean triangle always add up to exactly 180 degrees.',
        prompt: 'If a triangle has angles of 48° and 67°, what is the third angle?',
        options: ['55°', '65°', '75°', '85°'],
        correctIndex: 1,
        explanation: '180° − (48° + 67°) = 180° − 115° = 65°.',
      },
      {
        id: 'math-algebra',
        topic: 'Linear Thinking',
        conceptSummary:
          'To isolate an unknown variable x, apply inverse operations equally to both sides of the equation.',
        prompt: 'If 3x + 7 = 28, what is the value of x?',
        options: ['6', '7', '8', '9'],
        correctIndex: 1,
        explanation: 'Subtract 7 from both sides to get 3x = 21, then divide by 3 to get x = 7.',
      },
    ],
  },
  {
    id: 'general-knowledge',
    title: 'General Knowledge',
    subtitle: 'Discover the world',
    tutorPromptPlaceholder: 'Ask Ātmiya about world geography, history, or inventions...',
    suggestedQuestion: 'Share 3 fascinating facts about ancient and modern science in India.',
    items: [
      {
        id: 'gk-oceans',
        topic: 'World Geography',
        conceptSummary:
          'Five interconnected oceanic basins cover more than 70% of Earth’s total surface area.',
        prompt: 'Which is the deepest known oceanic trench on Earth?',
        options: [
          'Puerto Rico Trench',
          'Java Trench',
          'Mariana Trench',
          'Tonga Trench',
        ],
        correctIndex: 2,
        explanation:
          'Challenger Deep in the western Pacific’s Mariana Trench reaches nearly 11,000 meters below sea level.',
      },
      {
        id: 'gk-printing',
        topic: 'Human Milestones',
        conceptSummary:
          'Movable-type printing transformed literacy by making books affordable and widely shareable.',
        prompt: 'Who introduced the mechanical movable-type printing press in 15th-century Europe?',
        options: [
          'Johannes Gutenberg',
          'Galileo Galilei',
          'Leonardo da Vinci',
          'Isaac Newton',
        ],
        correctIndex: 0,
        explanation:
          'Around 1440, Johannes Gutenberg’s movable metal type sparked the rapid spread of scientific and literary works.',
      },
      {
        id: 'gk-india-space',
        topic: 'Space Exploration',
        conceptSummary:
          'Chandrayaan-3 achieved a historic soft landing near the Moon’s south pole in August 2023.',
        prompt: 'What was the name of the rover deployed by India’s Chandrayaan-3 mission?',
        options: ['Vikram', 'Pragyan', 'Aryabhata', 'Gaganyaan'],
        correctIndex: 1,
        explanation:
          'The Vikram lander safely touched down near the lunar south pole and deployed the Pragyan rover.',
      },
    ],
  },
];

interface LearningScreenProps {
  settings: CompanionSettings;
  memories: UserMemory[];
  onBackToHome: () => void;
  onRecordLearningXp: (label: string, xpReward?: number) => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

const MathTilesBadge: React.FC = () => (
  <div
    aria-hidden="true"
    className="w-14 h-14 rounded-2xl grid grid-cols-2 gap-1 p-1.5 bg-white/10 dark:bg-[#0d193d] border border-slate-200 dark:border-indigo-300/25 shadow-inner shrink-0"
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

export const LearningScreen: React.FC<LearningScreenProps> = ({
  settings,
  memories,
  onBackToHome,
  onRecordLearningXp,
  onOpenChatWithPrompt,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<LearningSubjectId | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [rewardedQuestions, setRewardedQuestions] = useState<Record<string, boolean>>({});

  // Real AI Study Tutor state connected to /api/chat
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorReply, setTutorReply] = useState<string | null>(null);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [isAskingTutor, setIsAskingTutor] = useState(false);

  const activeSubject = useMemo(
    () => SUBJECTS.find((s) => s.id === selectedSubjectId) ?? null,
    [selectedSubjectId]
  );

  const handleOpenSubject = (subjectId: LearningSubjectId) => {
    setSelectedSubjectId(subjectId);
    setTutorReply(null);
    setTutorError(null);
    setTutorQuestion('');
  };

  const handleSelectAnswer = (q: ConceptQuestion, optIdx: number) => {
    if (selectedAnswers[q.id] !== undefined) return;
    setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
    if (optIdx === q.correctIndex && !rewardedQuestions[q.id]) {
      setRewardedQuestions((prev) => ({ ...prev, [q.id]: true }));
      onRecordLearningXp(`Learned ${q.topic}`, 10);
    }
  };

  const handleAskTutor = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isAskingTutor || !activeSubject) return;

    setIsAskingTutor(true);
    setTutorError(null);
    try {
      const response = await api.sendMessage({
        message: `[Learning Topic: ${activeSubject.title}] ${trimmed}`,
        history: [],
        memories: settings.memoryEnabled ? memories : [],
        personality: 'study',
        language: settings.language,
        userName: settings.userName,
      });
      setTutorReply(response.reply);
      setTutorQuestion('');
      onRecordLearningXp(`Studied ${activeSubject.title} with Ātmiya`, 5);
    } catch (err: any) {
      setTutorError(err?.message || 'Unable to reach Ātmiya tutor right now.');
    } finally {
      setIsAskingTutor(false);
    }
  };

  const renderSubjectIcon = (id: LearningSubjectId) => {
    if (id === 'science') {
      return (
        <div
          aria-hidden="true"
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-indigo-500/25 border border-sky-400/35 flex items-center justify-center shrink-0"
        >
          <FlaskConical className="w-7 h-7 text-amber-400 dark:text-amber-300" />
        </div>
      );
    }
    if (id === 'math') {
      return <MathTilesBadge />;
    }
    return (
      <div
        aria-hidden="true"
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/25 via-blue-600/25 to-emerald-400/20 border border-sky-400/35 flex items-center justify-center shrink-0"
      >
        <Globe2 className="w-7 h-7 text-sky-500 dark:text-sky-300" />
      </div>
    );
  };

  return (
    <SubpageBackdrop>
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex flex-col justify-center gap-5">
        {/* Top Navigation Back Pill */}
        <div className="flex items-center justify-between gap-3">
          <BackPillButton
            label={activeSubject ? 'All Subjects' : 'Back'}
            onClick={() => {
              if (activeSubject) {
                setSelectedSubjectId(null);
              } else {
                onBackToHome();
              }
            }}
          />
          {activeSubject && (
            <button
              type="button"
              onClick={onBackToHome}
              className="text-xs font-medium text-slate-600 dark:text-sky-200 hover:underline cursor-pointer"
            >
              Return to Companion
            </button>
          )}
        </div>

        {/* Main 2-Column Composition Matching Reference */}
        {!activeSubject ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center my-auto">
            {/* Left Column: Consistent 3D Ātmiya Character */}
            <div className="lg:col-span-5">
              <AvatarShowcasePanel
                config={settings.avatarConfig}
                emotion="smile"
                expressionsEnabled={settings.expressionsEnabled ?? true}
                cameraPreset="close-up"
              />
            </div>

            {/* Right Column: Title + 3 Interactive Subject Cards */}
            <div className="lg:col-span-7 space-y-5">
              <PageHeading
                title="Let's Learn Together!"
                subtitle="Explore new concepts with Ātmiya"
              />

              <div className="space-y-3.5">
                {SUBJECTS.map((subject, idx) => {
                  const gradientClass =
                    idx === 0
                      ? 'dark:from-[#0e265a]/85 dark:via-[#0b1b45]/88 dark:to-[#091538]/90 dark:border-sky-400/35'
                      : idx === 1
                      ? 'dark:from-[#0f1d4d]/85 dark:via-[#141b4e]/88 dark:to-[#0c143a]/90 dark:border-indigo-400/35'
                      : 'dark:from-[#0c2052]/85 dark:via-[#0d1946]/88 dark:to-[#091336]/90 dark:border-blue-400/35';

                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => handleOpenSubject(subject.id)}
                      className={`group w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-gradient-to-r ${gradientClass} border border-slate-200 hover:border-blue-400 dark:hover:border-sky-300/65 shadow-xs dark:shadow-[0_14px_34px_rgba(3,8,28,0.55)] hover:shadow-md dark:hover:shadow-[0_16px_38px_rgba(37,99,235,0.28)] flex items-center gap-4 text-left transition duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`}
                    >
                      {renderSubjectIcon(subject.id)}

                      <div className="min-w-0 flex-1">
                        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                          {subject.title}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300/90 mt-0.5">
                          {subject.subtitle}
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-400 dark:text-sky-300/80 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Interactive Subject Learning Studio */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 space-y-4">
              <AvatarShowcasePanel
                config={settings.avatarConfig}
                emotion="curious"
                expressionsEnabled={settings.expressionsEnabled ?? true}
                cameraPreset="close-up"
                caption={`${activeSubject.title} · Guided Study`}
              />

              {/* Live Ātmiya Study Tutor Box */}
              <div className="rounded-2xl bg-white dark:bg-[#091332]/90 border border-slate-200 dark:border-indigo-400/28 p-4 space-y-3 shadow-sm dark:shadow-[0_14px_34px_rgba(3,8,28,0.45)]">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-300 shrink-0" />
                  <span>Ask Ātmiya Tutor</span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleAskTutor(tutorQuestion);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={tutorQuestion}
                    onChange={(e) => setTutorQuestion(e.target.value)}
                    placeholder={activeSubject.tutorPromptPlaceholder}
                    aria-label="Ask a study question"
                    className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#060d24] border border-slate-200 dark:border-indigo-400/25 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!tutorQuestion.trim() || isAskingTutor}
                    aria-label="Send study question"
                    className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isAskingTutor ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </form>

                {!tutorReply && !tutorError && (
                  <button
                    type="button"
                    onClick={() => void handleAskTutor(activeSubject.suggestedQuestion)}
                    disabled={isAskingTutor}
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c1942]/80 hover:bg-blue-50 dark:hover:bg-[#13245c] border border-slate-200 dark:border-indigo-400/20 text-[11px] text-slate-700 dark:text-sky-100 cursor-pointer transition"
                  >
                    Try: "{activeSubject.suggestedQuestion}"
                  </button>
                )}

                {tutorError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/35 text-[11px] text-rose-800 dark:text-rose-200">
                    {tutorError}
                  </div>
                )}

                {tutorReply && (
                  <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-[#0d1c47] border border-blue-200 dark:border-sky-400/30 text-xs text-slate-800 dark:text-slate-100 leading-relaxed space-y-2 max-h-52 overflow-y-auto">
                    <p className="whitespace-pre-wrap">{tutorReply}</p>
                    {onOpenChatWithPrompt && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenChatWithPrompt(
                            `Let's continue learning ${activeSubject.title} together!`
                          )
                        }
                        className="text-[11px] font-semibold text-blue-700 dark:text-sky-300 hover:underline cursor-pointer"
                      >
                        Continue voice/3D chat on Home →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PageHeading
                  title={activeSubject.title}
                  subtitle={`${activeSubject.subtitle} · Interactive concept checks`}
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  {activeSubject.items.filter((it) => selectedAnswers[it.id] === it.correctIndex).length}/
                  {activeSubject.items.length} checked
                </span>
              </div>

              <div className="space-y-4">
                {activeSubject.items.map((item) => {
                  const chosen = selectedAnswers[item.id];
                  const isRevealed = chosen !== undefined;
                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl bg-white dark:bg-[#091332]/88 border border-slate-200 dark:border-indigo-400/28 p-5 space-y-3.5 shadow-xs dark:shadow-[0_14px_34px_rgba(3,8,28,0.45)]"
                    >
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-blue-600 dark:text-sky-300 tracking-wide">
                          {item.topic}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300 shrink-0 mt-0.5" />
                          <span>{item.conceptSummary}</span>
                        </p>
                      </div>

                      <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug">
                        {item.prompt}
                      </h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {item.options.map((opt, idx) => {
                          const isPicked = chosen === idx;
                          const isCorrect = idx === item.correctIndex;
                          let style =
                            'bg-slate-50 dark:bg-[#060e26] hover:bg-blue-50 dark:hover:bg-[#102052] border-slate-200 dark:border-indigo-400/22 text-slate-800 dark:text-slate-100';
                          if (isRevealed) {
                            if (isCorrect) {
                              style =
                                'bg-emerald-50 dark:bg-emerald-950/75 border-emerald-500 text-emerald-900 dark:text-emerald-100';
                            } else if (isPicked) {
                              style =
                                'bg-rose-50 dark:bg-rose-950/75 border-rose-500 text-rose-900 dark:text-rose-100';
                            } else {
                              style =
                                'bg-slate-100 dark:bg-[#060d20]/60 border-slate-200 dark:border-slate-800 text-slate-400';
                            }
                          }
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={isRevealed}
                              onClick={() => handleSelectAnswer(item, idx)}
                              className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-[13px] font-medium flex items-center justify-between gap-2 transition cursor-pointer disabled:cursor-default ${style}`}
                            >
                              <span>{opt}</span>
                              {isRevealed && isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
                              )}
                              {isRevealed && isPicked && !isCorrect && (
                                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-300 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {isRevealed && (
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-sky-400/30 text-xs text-slate-700 dark:text-slate-200 leading-relaxed animate-fadeIn">
                          {chosen === item.correctIndex ? 'Correct (+10 XP): ' : 'Concept note: '}
                          {item.explanation}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </SubpageBackdrop>
  );
};
