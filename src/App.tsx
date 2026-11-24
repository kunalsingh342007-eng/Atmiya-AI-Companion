import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ActiveNavTab,
  AvatarAnimationRequest,
  AvatarAppearanceConfig,
  AvatarEmotion,
  AvatarState,
  ChatMessage,
  CompanionSettings,
  ConversationSession,
  GameId,
  GameProgress,
  RoomConfig,
  SystemStatus,
  UnifiedAnimationState,
  UserMemory,
} from './types/companion';
import { DEFAULT_ROOM_CONFIG, storage } from './services/storage';
import { api } from './services/api';
import { speechService } from './services/speech';
import { playGameSound } from './services/gameAudio';

// Game Shell & 5 Main Screens
import { GameShell } from './components/Game/GameShell';
import { HomeScreen } from './components/Home/HomeScreen';
import { GameHub } from './components/Play/GameHub';
import { WardrobeScreen } from './components/Wardrobe/WardrobeScreen';
import { MemoriesScreen } from './components/Memory/MemoriesScreen';
import { SettingsScreen } from './components/Settings/SettingsScreen';

// Companion Controllers & Drawers
import {
  AvatarControllerActions,
  AvatarControllerState,
  AvatarGesture,
  CameraPreset,
  useMicrophonePermission,
} from './components/Avatar/AvatarController';
import { UnifiedAnimationController } from './components/Avatar/UnifiedAnimationController';
import { normalizeAvatarEmotion } from './components/Avatar/expressionRig';
import type { GlbInspectionReport } from './components/Avatar/RealisticAvatar';
import { ConversationSidebar } from './components/Sidebar/ConversationSidebar';
import { ChatDrawer } from './components/Chat/ChatDrawer';

import { AlertTriangle, Check } from 'lucide-react';

export default function App() {
  // Navigation & Game Progression State
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('home');
  const [progress, setProgress] = useState<GameProgress>(() => storage.getProgress());
  const [showFirstTimeHint, setShowFirstTimeHint] = useState<boolean>(
    () => !storage.isHomeHintDismissed()
  );
  const [speechBubbleText, setSpeechBubbleText] = useState<string | null>(null);

  // Core Companion Persistence State
  const [settings, setSettings] = useState<CompanionSettings>(storage.getSettings());
  const [conversations, setConversations] = useState<ConversationSession[]>(storage.getConversations());
  const [activeConvId, setActiveConvId] = useState<string | null>(storage.getActiveConversationId());
  const [memories, setMemories] = useState<UserMemory[]>(storage.getMemories());
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    isKeyConfigured: false,
    model: 'gemini-4-hydrogen',
    ttsModel: 'gemini-3.8-flash-lite-tts',
    transcribeModel: 'gemini-3.5-transcribe',
    supportedVoices: ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'],
  });

  // Drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  // Companion Avatar & Voice State (synchronized via UnifiedAnimationController)
  const animControllerRef = useRef<UnifiedAnimationController | null>(null);
  if (!animControllerRef.current) {
    animControllerRef.current = new UnifiedAnimationController();
  }
  const [unifiedState, setUnifiedState] = useState<UnifiedAnimationState>('idle');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [companionEmotion, setCompanionEmotion] = useState<AvatarEmotion>('neutral');
  const [emotionIntensity, setEmotionIntensity] = useState<number>(0.7);
  const [previewEmotion, setPreviewEmotion] = useState<AvatarEmotion | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiSpokenText, setAiSpokenText] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [suggestedMemory, setSuggestedMemory] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [glbInspection, setGlbInspection] = useState<GlbInspectionReport | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeGesture, setActiveGesture] = useState<AvatarGesture>('none');
  const [gestureNonce, setGestureNonce] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(
    () => settings.avatarConfig.defaultCameraPreset ?? 'close-up'
  );
  const [resetCameraNonce, setResetCameraNonce] = useState<number>(0);
  const [isExpressionsOpen, setIsExpressionsOpen] = useState<boolean>(false);

  // Phase 4: Preserved Drafts & Unsaved Changes Guard
  const [draftsBySession, setDraftsBySession] = useState<Record<string, string>>({});
  const [wardrobeDraftAvatar, setWardrobeDraftAvatar] = useState<AvatarAppearanceConfig>(
    settings.avatarConfig
  );
  const [wardrobeDraftRoom, setWardrobeDraftRoom] = useState<RoomConfig>(
    settings.roomConfig ?? DEFAULT_ROOM_CONFIG
  );
  const [hasUnsavedMemoryDraft, setHasUnsavedMemoryDraft] = useState(false);
  const [pendingNavTab, setPendingNavTab] = useState<ActiveNavTab | null>(null);

  const [micPermission, refreshMicPermission, markMicDenied] = useMicrophonePermission();

  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingGreetingAudioCleanupRef = useRef<(() => void) | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const avatarStateRef = useRef<AvatarState>(avatarState);
  const turnEpochRef = useRef<number>(0);
  const activeAbortRef = useRef<AbortController | null>(null);
  const lastFailedMessageRef = useRef<string | null>(null);
  const ttsQuotaNotifiedRef = useRef<boolean>(false);

  const isSoundEnabled = settings.voiceEngine !== 'none' && settings.autoSpeakResponse;

  useEffect(() => {
    avatarStateRef.current = avatarState;
  }, [avatarState]);

  // Keep React view state synchronized with the UnifiedAnimationController
  useEffect(() => {
    const ctrl = animControllerRef.current;
    if (!ctrl) return;
    const unsub = ctrl.subscribe((snap) => {
      setUnifiedState(snap.unifiedState);
      setAvatarState((prev) => (prev === 'interrupted' ? prev : snap.avatarState));
      setCompanionEmotion(snap.emotion);
      setEmotionIntensity(snap.emotionIntensity);
      setActiveGesture(snap.activeGesture);
      setGestureNonce(snap.gestureNonce);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const isLight = settings.theme === 'light';
    document.documentElement.classList.toggle('dark', !isLight);
    document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
  }, [settings.theme]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  const cancelPendingGreetingAudio = useCallback(() => {
    if (pendingGreetingAudioCleanupRef.current) {
      pendingGreetingAudioCleanupRef.current();
      pendingGreetingAudioCleanupRef.current = null;
    }
  }, []);

  const cancelActiveTurn = useCallback(() => {
    turnEpochRef.current += 1;
    cancelPendingGreetingAudio();
    animControllerRef.current?.cancelPendingRequests();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    isProcessingRef.current = false;
    setIsThinking(false);
  }, [cancelPendingGreetingAudio]);

  // 1. Initial Load
  useEffect(() => {
    api.getStatus().then((status) => {
      setSystemStatus(status);
    });

    let currentSessions = storage.getConversations();
    let currentId = storage.getActiveConversationId();

    if (currentSessions.length === 0) {
      const newSession = storage.createConversation(settings.personality, settings.language);
      currentSessions = [newSession];
      currentId = newSession.id;
      setConversations(currentSessions);
      setActiveConvId(currentId);
    } else if (!currentId || !currentSessions.some((c) => c.id === currentId)) {
      currentId = currentSessions[0].id;
      storage.setActiveConversationId(currentId);
      setActiveConvId(currentId);
    }

    const activeSession = currentSessions.find((c) => c.id === currentId);
    if (activeSession && activeSession.messages.length > 0) {
      const lastModel = [...activeSession.messages].reverse().find((m) => m.role === 'model');
      if (lastModel) {
        setAiSpokenText(lastModel.content);
      }
    }

    setIsAppReady(true);

    return () => {
      cancelActiveTurn();
      speechService.stopSpeaking();
      speechService.stopRecognition();
      animControllerRef.current?.dispose();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, []);

  // 2. Audio Level Sync for avatar mouth/aura animation (without clobbering concurrent emotion)
  useEffect(() => {
    speechService.setAudioLevelCallback((level) => {
      setAudioLevel(level);
      const currentUnified = animControllerRef.current?.getSnapshot().unifiedState;
      if (level > 0.05) {
        setIsSpeaking(true);
        if (avatarStateRef.current !== 'speaking' && currentUnified !== 'speaking') {
          animControllerRef.current?.dispatch({
            animationState: 'speaking',
            keepActiveSpeech: true,
            source: 'voice',
          });
          setAvatarState('speaking');
        }
      } else if (!speechService.getIsSpeaking()) {
        setIsSpeaking(false);
        if (avatarStateRef.current === 'speaking' || currentUnified === 'speaking') {
          animControllerRef.current?.returnToIdle();
          setAvatarState('idle');
        }
      }
    });

    return () => {
      speechService.setAudioLevelCallback(null);
    };
  }, []);

  const currentConversation = conversations.find((c) => c.id === activeConvId);
  const messages = currentConversation?.messages || [];

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3200);
  };

  const showSpeechBubble = (text: string, durationMs = 4500) => {
    if (bubbleTimeoutRef.current) {
      clearTimeout(bubbleTimeoutRef.current);
    }
    setSpeechBubbleText(text);
    bubbleTimeoutRef.current = setTimeout(() => {
      setSpeechBubbleText(null);
      bubbleTimeoutRef.current = null;
    }, durationMs);
  };

  const dismissHint = () => {
    if (showFirstTimeHint) {
      setShowFirstTimeHint(false);
      storage.dismissHomeHint();
    }
  };

  const savedRoomConfig = settings.roomConfig ?? DEFAULT_ROOM_CONFIG;
  const hasUnsavedWardrobeChanges =
    JSON.stringify(wardrobeDraftAvatar) !== JSON.stringify(settings.avatarConfig) ||
    JSON.stringify(wardrobeDraftRoom) !== JSON.stringify(savedRoomConfig);

  const currentComposerDraft = activeConvId ? draftsBySession[activeConvId] ?? '' : '';

  const updateCurrentComposerDraft = useCallback(
    (nextText: string) => {
      if (!activeConvId) return;
      setDraftsBySession((prev) => {
        if (!nextText && !(activeConvId in prev)) return prev;
        return { ...prev, [activeConvId]: nextText };
      });
    },
    [activeConvId]
  );

  const executeSelectTab = useCallback(
    (tab: ActiveNavTab) => {
      if (tab !== 'home' && avatarStateRef.current === 'listening') {
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
        speechService.stopRecognition();
        animControllerRef.current?.returnToIdle();
        setAvatarState('idle');
      }
      if (tab !== 'home') {
        setIsChatDrawerOpen(false);
        setIsSidebarOpen(false);
      }
      setActiveTab(tab);
    },
    []
  );

  const handleSelectTab = (tab: ActiveNavTab) => {
    if (tab === activeTab) return;
    if (
      (activeTab === 'wardrobe' && hasUnsavedWardrobeChanges) ||
      (activeTab === 'memories' && hasUnsavedMemoryDraft)
    ) {
      setPendingNavTab(tab);
      return;
    }
    executeSelectTab(tab);
  };

  const startListeningTurn = (allowAutoUnmute = false) => {
    if (isProcessingRef.current) return;
    if (isMicMuted) {
      if (!allowAutoUnmute) return;
      setIsMicMuted(false);
    }

    if (!speechService.isRecognitionSupported()) {
      const msg = 'Voice input is not supported in this browser — type your message below.';
      setVoiceError(msg);
      setAvatarState('error');
      showToast(msg);
      return;
    }

    dismissHint();
    cancelPendingGreetingAudio();
    const epochAtStart = turnEpochRef.current;
    setPreviewEmotion(null);
    setVoiceError(null);
    setChatError(null);
    speechService.stopSpeaking();
    animControllerRef.current?.dispatch({
      animationState: 'listening',
      emotion: 'neutral',
      gesture: 'none',
      force: true,
      source: 'voice',
    });
    setAvatarState('listening');
    setUserTranscript('');

    const langLocale: 'hi-IN' | 'en-IN' = settings.language === 'hi' ? 'hi-IN' : 'en-IN';

    const started = speechService.startRecognition(langLocale, {
      onStart: () => {
        if (turnEpochRef.current !== epochAtStart) return;
        setVoiceError(null);
        refreshMicPermission();
        animControllerRef.current?.dispatch({
          animationState: 'listening',
          emotion: 'neutral',
          force: true,
          source: 'voice',
        });
        setAvatarState('listening');
      },
      onResult: (transcript, _isFinal) => {
        if (turnEpochRef.current !== epochAtStart) return;
        setUserTranscript(transcript);

        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }

        speechTimeoutRef.current = setTimeout(() => {
          if (turnEpochRef.current === epochAtStart && transcript.trim() && !isProcessingRef.current) {
            handleSendMessage(transcript.trim());
          }
        }, 1300);
      },
      onError: (err) => {
        if (turnEpochRef.current !== epochAtStart) return;
        if (/denied|not-allowed|allow microphone/i.test(err)) {
          markMicDenied();
        } else {
          refreshMicPermission();
        }
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
        setVoiceError(err);
        setAvatarState('error');
        showToast(err);
      },
      onEnd: () => {
        if (turnEpochRef.current !== epochAtStart) return;
        if (!isProcessingRef.current && !speechService.getIsSpeaking() && avatarStateRef.current === 'listening') {
          animControllerRef.current?.returnToIdle();
          setAvatarState('idle');
        }
      },
    });

    if (!started) {
      const msg = 'Speech recognition unavailable. You can type below.';
      setVoiceError(msg);
      setAvatarState('error');
      showToast(msg);
    }
  };

  const stopListeningTurn = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    speechService.stopRecognition();
    animControllerRef.current?.returnToIdle();
    setAvatarState('idle');
  };

  const handleToggleListen = () => {
    if (isProcessingRef.current) return;
    if (avatarState === 'speaking') {
      speechService.stopSpeaking();
      setIsSpeaking(false);
    }
    if (avatarState === 'listening') {
      if (userTranscript.trim()) {
        handleSendMessage(userTranscript.trim());
      } else {
        stopListeningTurn();
      }
    } else {
      startListeningTurn(true);
    }
  };

  const handleRetryMic = () => {
    setVoiceError(null);
    setAvatarState('idle');
    refreshMicPermission();
    startListeningTurn(true);
  };

  const handleToggleMute = () => {
    if (isMicMuted) {
      setIsMicMuted(false);
      setVoiceError(null);
      showToast('Microphone unmuted');
    } else {
      setIsMicMuted(true);
      stopListeningTurn();
      showToast('Microphone muted');
    }
  };

  const handleToggleSound = () => {
    if (isSoundEnabled) {
      speechService.stopSpeaking();
      setIsSpeaking(false);
      if (avatarStateRef.current === 'speaking') {
        setAvatarState('idle');
      }
      const updated = { ...settings, autoSpeakResponse: false };
      handleSaveSettings(updated, 'Sound & voice replies muted');
    } else {
      const updated: CompanionSettings = {
        ...settings,
        voiceEngine: settings.voiceEngine === 'none' ? 'gemini-native' : settings.voiceEngine,
        autoSpeakResponse: true,
      };
      handleSaveSettings(updated, 'Sound & voice replies enabled');
    }
  };

  const handleInterrupt = useCallback(() => {
    cancelActiveTurn();
    const interruptEpoch = turnEpochRef.current;
    speechService.stopSpeaking();
    speechService.stopRecognition();
    animControllerRef.current?.returnToIdle();
    setIsSpeaking(false);
    setAvatarState('interrupted');
    setCompanionEmotion('neutral');
    showToast('Speech stopped');

    setTimeout(() => {
      if (turnEpochRef.current !== interruptEpoch) return;
      setAvatarState('idle');
    }, 450);
  }, [cancelActiveTurn]);

  const handleEndCall = () => {
    cancelActiveTurn();
    speechService.stopSpeaking();
    speechService.stopRecognition();
    animControllerRef.current?.returnToIdle();
    setIsSpeaking(false);
    setVoiceError(null);
    setChatError(null);
    setAvatarState('idle');
    setCompanionEmotion('neutral');
    setUserTranscript('');
    showToast('Turn reset');
  };

  const triggerAvatarGesture = useCallback((gesture: AvatarGesture, durationMs?: number) => {
    animControllerRef.current?.dispatch({
      gesture,
      durationMs,
      keepActiveSpeech: true,
      source: 'user-action',
    });
  }, []);

  const handleResetPose = useCallback(() => {
    setPreviewEmotion(null);
    if (!isProcessingRef.current && avatarStateRef.current === 'idle') {
      animControllerRef.current?.returnToIdle();
    }
  }, []);

  /**
   * Typed request entrypoint for coordinating emotion, animation state/gesture, and optional speech.
   */
  const requestCompanionBehavior = useCallback(
    (req: AvatarAnimationRequest & { durationMs?: number }) => {
      const ctrl = animControllerRef.current;
      if (!ctrl) return;
      const res = ctrl.dispatch({
        ...req,
        force: true,
        source: 'user-action',
      });
      if (!res.accepted) return;

      if (req.speechText) {
        setAiSpokenText(req.speechText);
        showSpeechBubble(req.speechText, req.durationMs ?? 4500);

        if (isSoundEnabled) {
          const reqId = res.requestId;
          const reqEpoch = turnEpochRef.current;
          ctrl.dispatch({
            animationState: 'speaking',
            emotion: req.emotion,
            gesture: req.gesture,
            intensity: req.intensity,
            force: true,
            source: 'voice',
          });
          setAvatarState('speaking');
          setIsSpeaking(true);
          speechService.speakWithBrowserTTS(
            req.speechText,
            settings.language === 'hi' ? 'hi-IN' : 'en-IN',
            settings.speechRate,
            () => {
              if (turnEpochRef.current !== reqEpoch) return;
              setIsSpeaking(false);
              ctrl.returnToIdle(reqId + 1);
              setAvatarState('idle');
            }
          );
        }
      }
    },
    [isSoundEnabled, settings.language, settings.speechRate]
  );

  // Phase 5: Session-once App-Open Greeting when app is ready & 3D avatar finishes loading
  const avatarType = settings.avatarConfig.avatarType ?? '3d-glb';
  const isAvatarReady = avatarType === '3d-glb' ? Boolean(glbInspection) : true;

  useEffect(() => {
    if (!isAppReady || !isAvatarReady || activeTab !== 'home') return;
    if (isProcessingRef.current || speechService.getIsSpeaking()) return;

    const ctrl = animControllerRef.current;
    if (!ctrl) return;

    const trimmedUser = settings.userName?.trim();
    const greetingLine = trimmedUser
      ? `Hi ${trimmedUser}! Welcome back! How can I help you today?`
      : 'Hi! Welcome back! How can I help you today?';
    const greetingSpeechRate = settings.speechRate;
    const greetingLang = settings.language === 'hi' ? 'hi-IN' : 'en-IN';
    const soundAllowed = settings.voiceEngine !== 'none' && settings.autoSpeakResponse;

    const cancelPendingSchedule = ctrl.scheduleOpeningGreetingOnce({
      delayMs: 80,
      durationMs: 3200,
      canStart: () =>
        !isProcessingRef.current &&
        !speechService.getIsSpeaking() &&
        avatarStateRef.current === 'idle',
      onTrigger: (greetReqId) => {
        showSpeechBubble(greetingLine, 4600);
        if (!soundAllowed) return;

        const playGreetingVoice = async () => {
          if (isProcessingRef.current || speechService.getIsSpeaking()) return;
          const epochAtVoice = turnEpochRef.current;

          const outcome = await speechService.speakWithAutoplaySupport(
            greetingLine,
            greetingLang,
            greetingSpeechRate,
            {
              onStart: () => {
                if (turnEpochRef.current !== epochAtVoice) return;
                ctrl.dispatch({
                  animationState: 'speaking',
                  emotion: 'happy',
                  intensity: 0.85,
                  force: true,
                  source: 'app-open',
                });
                setAvatarState('speaking');
                setIsSpeaking(true);
              },
              onEnd: () => {
                if (turnEpochRef.current !== epochAtVoice) return;
                setIsSpeaking(false);
                ctrl.returnToIdle();
                setAvatarState('idle');
              },
              onBlocked: () => {
                // Respect browser autoplay security: keep visual greeting + queue speech for first user gesture
                cancelPendingGreetingAudio();
                pendingGreetingAudioCleanupRef.current = speechService.onFirstUserInteraction(() => {
                  pendingGreetingAudioCleanupRef.current = null;
                  if (
                    isProcessingRef.current ||
                    speechService.getIsSpeaking() ||
                    avatarStateRef.current === 'listening' ||
                    settings.voiceEngine === 'none' ||
                    !settings.autoSpeakResponse
                  ) {
                    return;
                  }
                  const deferredEpoch = turnEpochRef.current;
                  void speechService.speakWithAutoplaySupport(
                    greetingLine,
                    greetingLang,
                    greetingSpeechRate,
                    {
                      onStart: () => {
                        if (turnEpochRef.current !== deferredEpoch) return;
                        ctrl.dispatch({
                          animationState: 'speaking',
                          emotion: 'happy',
                          intensity: 0.85,
                          force: true,
                          source: 'app-open',
                        });
                        setAvatarState('speaking');
                        setIsSpeaking(true);
                      },
                      onEnd: () => {
                        if (turnEpochRef.current !== deferredEpoch) return;
                        setIsSpeaking(false);
                        ctrl.returnToIdle();
                        setAvatarState('idle');
                      },
                    }
                  );
                });
              },
            }
          );

          // If autoplay was blocked cleanly, ensure visual greeting still holds & settles back to idle
          if (outcome === 'autoplay-blocked' && ctrl.getSnapshot().requestId === greetReqId) {
            setIsSpeaking(false);
          }
        };

        void playGreetingVoice();
      },
    });

    return () => {
      cancelPendingSchedule();
    };
  }, [
    isAppReady,
    isAvatarReady,
    activeTab,
    settings.voiceEngine,
    settings.autoSpeakResponse,
    settings.language,
    settings.speechRate,
    cancelPendingGreetingAudio,
  ]);

  const triggerCompanionReaction = (
    emotion: AvatarEmotion,
    activityLabel: string,
    line: string,
    speakLine = false,
    gesture: AvatarGesture = 'none',
    explicitState?: UnifiedAnimationState
  ) => {
    if (isProcessingRef.current || speechService.getIsSpeaking()) return;

    dismissHint();
    cancelPendingGreetingAudio();
    playGameSound('tap', isSoundEnabled);
    setAiSpokenText(line);
    showSpeechBubble(line);

    const { progress: nextProg, newlyUnlockedRooms } = storage.recordInteraction(activityLabel, 5);
    setProgress(nextProg);
    if (newlyUnlockedRooms.length > 0) {
      showToast('New room theme unlocked in Wardrobe!');
    }

    const ctrl = animControllerRef.current;
    const reactionEpoch = turnEpochRef.current;

    if (speakLine && isSoundEnabled) {
      const dispatchRes = ctrl?.dispatch({
        animationState: explicitState ?? 'speaking',
        emotion,
        gesture,
        intensity: 0.78,
        force: true,
        source: 'user-action',
      });
      setAvatarState('speaking');
      setIsSpeaking(true);
      speechService.speakWithBrowserTTS(
        line,
        settings.language === 'hi' ? 'hi-IN' : 'en-IN',
        settings.speechRate,
        () => {
          if (turnEpochRef.current !== reactionEpoch) return;
          setIsSpeaking(false);
          ctrl?.returnToIdle(dispatchRes?.requestId);
          setAvatarState('idle');
        }
      );
    } else {
      ctrl?.dispatch({
        animationState: explicitState,
        emotion,
        gesture,
        intensity: 0.78,
        durationMs: 2600,
        force: true,
        source: 'user-action',
      });
    }
  };

  const handleTapAvatar = () => {
    const greetings = [
      'Namaste! Main yahin hoon — bataiye aaj kya chal raha hai?',
      'Hey! Good to see you here. Want to talk or play a quick game?',
      'Haanji! I am right here and listening whenever you are ready.',
    ];
    const picked = greetings[Math.floor(Math.random() * greetings.length)];
    triggerCompanionReaction('smile', 'Greeted Ātmiya', picked, true, 'nod', 'greeting');
  };

  const handleSendMessage = async (text: string, options: { isRetry?: boolean } = {}) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessingRef.current || !activeConvId) return;

    dismissHint();
    cancelActiveTurn();
    const myEpoch = turnEpochRef.current;
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

    setPreviewEmotion(null);
    setVoiceError(null);
    setChatError(null);
    lastFailedMessageRef.current = null;
    speechService.stopRecognition();
    speechService.stopSpeaking();

    isProcessingRef.current = true;
    setIsThinking(true);
    animControllerRef.current?.dispatch({
      animationState: 'thinking',
      emotion: 'thinking',
      gesture: 'none',
      intensity: 0.7,
      force: true,
      source: 'conversation',
    });
    setAvatarState('thinking');
    setUserTranscript(trimmed);
    updateCurrentComposerDraft('');

    const lastMsg = messages[messages.length - 1];
    const shouldReusePendingUserMsg =
      Boolean(options.isRetry) &&
      lastMsg?.role === 'user' &&
      lastMsg.content.trim() === trimmed;

    const currentMsgs = shouldReusePendingUserMsg
      ? messages
      : [
          ...messages,
          {
            id: 'msg_' + Date.now(),
            role: 'user' as const,
            content: trimmed,
            timestamp: Date.now(),
          },
        ];

    if (!shouldReusePendingUserMsg) {
      storage.updateConversation(activeConvId, {
        messages: currentMsgs,
        title:
          messages.length === 0
            ? trimmed.slice(0, 36)
            : currentConversation?.title || 'Companion Session',
      });
      setConversations(storage.getConversations());
    }

    try {
      const response = await api.sendMessage(
        {
          message: trimmed,
          history: currentMsgs,
          memories: settings.memoryEnabled ? memories : [],
          personality: settings.personality,
          language: settings.language,
          userName: settings.userName,
        },
        abortController.signal
      );

      if (turnEpochRef.current !== myEpoch || abortController.signal.aborted) {
        return;
      }

      const replyText = typeof response?.reply === 'string' ? response.reply.trim() : '';
      if (!replyText) {
        throw new Error('Ātmiya could not form a response right now. Please try again.');
      }
      setAiSpokenText(replyText);
      const shortPreview =
        replyText.length <= 110 ? replyText : `${replyText.slice(0, 107).trim()}...`;
      showSpeechBubble(shortPreview, 5000);

      // Strictly use explicit backend emotion metadata (controlled mapping, neutral fallback — no keyword regex)
      const replyEmotion: AvatarEmotion = normalizeAvatarEmotion(response.emotion);
      const nextIntensity =
        typeof response.intensity === 'number' && !Number.isNaN(response.intensity)
          ? Math.max(0.2, Math.min(1, response.intensity))
          : 0.7;

      const aiMessage: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'model',
        content: replyText,
        emotion: replyEmotion,
        emotionIntensity: nextIntensity,
        timestamp: Date.now(),
      };

      const updatedMsgs = [...currentMsgs, aiMessage];
      storage.updateConversation(activeConvId, {
        messages: updatedMsgs,
      });
      setConversations(storage.getConversations());

      if (response.memorySuggestion?.detected && settings.memoryEnabled) {
        setSuggestedMemory(response.memorySuggestion.candidateText);
      }

      setIsThinking(false);
      isProcessingRef.current = false;

      if (isSoundEnabled) {
        const speechDispatch = animControllerRef.current?.dispatch({
          animationState: 'speaking',
          emotion: replyEmotion,
          intensity: nextIntensity,
          force: true,
          source: 'conversation',
        });
        setAvatarState('speaking');
        setIsSpeaking(true);

        const onFinish = () => {
          if (turnEpochRef.current !== myEpoch) return;
          setIsSpeaking(false);
          animControllerRef.current?.returnToIdle(speechDispatch?.requestId);
          setAvatarState('idle');

          if (settings.handsFreeMode && !isMicMuted && activeTab === 'home') {
            setTimeout(() => {
              if (turnEpochRef.current === myEpoch && !isProcessingRef.current && !speechService.getIsSpeaking()) {
                startListeningTurn();
              }
            }, 600);
          }
        };

        if (settings.voiceEngine === 'gemini-native' && !api.isTtsInCooldown()) {
          try {
            const ttsRes = await api.generateTTS(
              {
                text: replyText,
                voice: settings.selectedVoice || 'Kore',
              },
              abortController.signal
            );

            if (turnEpochRef.current !== myEpoch || abortController.signal.aborted) {
              return;
            }

            if (ttsRes.audioBase64) {
              await speechService.playWavAudio(ttsRes.audioBase64, onFinish, () => {
                if (turnEpochRef.current !== myEpoch) return;
                speechService.speakWithBrowserTTS(replyText, settings.language, settings.speechRate, onFinish);
              });
              return;
            }
          } catch (e: any) {
            if (e?.name === 'AbortError' || turnEpochRef.current !== myEpoch) {
              return;
            }
            const isQuotaError =
              e?.status === 429 ||
              e?.code === 'TTS_QUOTA_EXCEEDED' ||
              e?.code === 'TTS_QUOTA_COOLDOWN';
            if (isQuotaError) {
              if (!ttsQuotaNotifiedRef.current) {
                ttsQuotaNotifiedRef.current = true;
                showToast('Gemini voice quota reached — switched to browser voice.');
              }
              console.warn('Gemini TTS quota reached, using browser voice fallback.');
            } else {
              console.warn('TTS playback error, trying browser fallback:', e?.message || e);
            }
          }
        }

        if (turnEpochRef.current !== myEpoch) return;
        speechService.speakWithBrowserTTS(
          replyText,
          settings.language,
          settings.speechRate,
          onFinish
        );
      } else {
        // Sound off: display resolved emotion pose briefly, then return cleanly to idle/neutral
        animControllerRef.current?.dispatch({
          emotion: replyEmotion,
          intensity: nextIntensity,
          durationMs: 2800,
          force: true,
          source: 'conversation',
        });
        setAvatarState('idle');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || turnEpochRef.current !== myEpoch) {
        return;
      }
      console.warn('Recoverable chat turn failure:', err?.message || err);
      setIsThinking(false);
      isProcessingRef.current = false;
      animControllerRef.current?.returnToIdle();
      setAvatarState('error');
      const errMsg = err?.message || 'Connection failed. Please check API configuration or retry.';
      lastFailedMessageRef.current = trimmed;
      setChatError(errMsg);
      showToast('Error: ' + errMsg);
    } finally {
      if (activeAbortRef.current === abortController) {
        activeAbortRef.current = null;
      }
    }
  };

  const handleRetryLastMessage = () => {
    const retryText = lastFailedMessageRef.current;
    if (!retryText || isProcessingRef.current) return;
    handleSendMessage(retryText, { isRetry: true });
  };

  const handleDismissChatError = () => {
    setChatError(null);
    if (!isProcessingRef.current && avatarStateRef.current === 'error') {
      setAvatarState('idle');
    }
  };

  const handleDismissVoiceError = () => {
    setVoiceError(null);
    if (!isProcessingRef.current && avatarStateRef.current === 'error') {
      setAvatarState('idle');
    }
  };

  // Desktop keyboard shortcuts on Home
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingNavTab) setPendingNavTab(null);
        else if (isChatDrawerOpen) setIsChatDrawerOpen(false);
        else if (isSidebarOpen) setIsSidebarOpen(false);
        else if (isSpeaking) handleInterrupt();
        return;
      }

      if (activeTab !== 'home') return;

      const target = e.target as HTMLElement | null;
      const isTypingField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isTypingField || e.metaKey || e.ctrlKey || e.altKey || isSidebarOpen) return;

      const key = e.key.toLowerCase();
      if (key === 't') {
        e.preventDefault();
        handleToggleListen();
      } else if (key === 'c') {
        e.preventDefault();
        setIsChatDrawerOpen((prev) => !prev);
      } else if (key === 'g') {
        e.preventDefault();
        handleTapAvatar();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Memory & Settings Handlers
  const handleAddMemory = (mem: Omit<UserMemory, 'id' | 'createdAt' | 'updatedAt'>) => {
    storage.addMemory(mem);
    setMemories(storage.getMemories());
    showToast('Memory saved');
  };

  const handleUpdateMemory = (id: string, updates: Partial<UserMemory>) => {
    storage.updateMemory(id, updates);
    setMemories(storage.getMemories());
  };

  const handleDeleteMemory = (id: string) => {
    storage.deleteMemory(id);
    setMemories(storage.getMemories());
    showToast('Memory removed');
  };

  const handleClearAllMemories = () => {
    storage.clearAllMemories();
    setMemories([]);
    showToast('All memories cleared');
  };

  const handleClearAllConversations = () => {
    cancelActiveTurn();
    speechService.stopSpeaking();
    speechService.stopRecognition();
    storage.clearAllConversations();
    const fresh = storage.createConversation(settings.personality, settings.language);
    setConversations([fresh]);
    setActiveConvId(fresh.id);
    setDraftsBySession({});
    setAiSpokenText('');
    setUserTranscript('');
    setAvatarState('idle');
    showToast('Conversation history cleared');
  };

  const handleToggleMemoryEnabled = (enabled: boolean) => {
    const updated = { ...settings, memoryEnabled: enabled };
    setSettings(updated);
    storage.saveSettings(updated);
    showToast(enabled ? 'Memory enabled' : 'Memory disabled');
  };

  const handleSaveSettings = (newSettings: CompanionSettings, toastText = 'Settings saved') => {
    if (newSettings.voiceEngine === 'gemini-native' && newSettings.voiceEngine !== settings.voiceEngine) {
      api.resetTtsCooldown();
      ttsQuotaNotifiedRef.current = false;
    }
    setSettings(newSettings);
    storage.saveSettings(newSettings);
    setWardrobeDraftAvatar(newSettings.avatarConfig);
    setWardrobeDraftRoom(newSettings.roomConfig ?? DEFAULT_ROOM_CONFIG);
    showToast(toastText);
  };

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
    const updated: CompanionSettings = { ...settings, theme: nextTheme };
    handleSaveSettings(
      updated,
      nextTheme === 'light' ? 'Switched to Soft Light theme' : 'Switched to Deep Navy theme'
    );
  };

  const handleNewChat = () => {
    const newConv = storage.createConversation(settings.personality, settings.language);
    setConversations(storage.getConversations());
    setActiveConvId(newConv.id);
    handleEndCall();
    setAiSpokenText('');
    setSuggestedMemory(null);
    showToast('New session started');
  };

  const handleApplyWardrobe = (newAvatar: AvatarAppearanceConfig, newRoom: RoomConfig) => {
    const updated: CompanionSettings = {
      ...settings,
      avatarConfig: newAvatar,
      roomConfig: newRoom,
    };
    setSettings(updated);
    storage.saveSettings(updated);
    setWardrobeDraftAvatar(newAvatar);
    setWardrobeDraftRoom(newRoom);
    if (newAvatar.defaultCameraPreset) {
      setCameraPreset(newAvatar.defaultCameraPreset);
      setResetCameraNonce((n) => n + 1);
    }
    showToast('Customization applied');
  };

  const handleCompleteGame = (params: {
    gameId: GameId;
    gameTitle: string;
    score: number;
    xpReward: number;
  }) => {
    const { progress: nextProg, newAchievements, newlyUnlockedRooms } =
      storage.recordGameCompletion(params);
    setProgress(nextProg);

    if (newlyUnlockedRooms.length > 0) {
      showToast(`+${params.xpReward} XP! New room theme unlocked in Customize`);
    } else if (newAchievements.length > 0) {
      showToast(`+${params.xpReward} XP! Badge unlocked: ${newAchievements[0].title}`);
    } else {
      showToast(`${params.gameTitle} complete · +${params.xpReward} XP`);
    }
  };

  const handleRestoreData = () => {
    const restoredSettings = storage.getSettings();
    setSettings(restoredSettings);
    setWardrobeDraftAvatar(restoredSettings.avatarConfig);
    setWardrobeDraftRoom(restoredSettings.roomConfig ?? DEFAULT_ROOM_CONFIG);
    if (restoredSettings.avatarConfig.defaultCameraPreset) {
      setCameraPreset(restoredSettings.avatarConfig.defaultCameraPreset);
      setResetCameraNonce((n) => n + 1);
    }
    setMemories(storage.getMemories());
    setProgress(storage.getProgress());
    const reloadedConvs = storage.getConversations();
    setConversations(reloadedConvs);
    const activeId = storage.getActiveConversationId();
    if (activeId && reloadedConvs.some((c) => c.id === activeId)) {
      setActiveConvId(activeId);
    } else if (reloadedConvs.length > 0) {
      storage.setActiveConversationId(reloadedConvs[0].id);
      setActiveConvId(reloadedConvs[0].id);
    } else {
      const fresh = storage.createConversation(restoredSettings.personality, restoredSettings.language);
      setConversations([fresh]);
      setActiveConvId(fresh.id);
    }
    showToast('Backup restored successfully');
  };

  const tapAvatarRef = useRef(handleTapAvatar);
  tapAvatarRef.current = handleTapAvatar;

  const stableOnTapAvatar = useCallback(() => {
    tapAvatarRef.current();
  }, []);

  const handleChangeCameraPreset = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset);
    setResetCameraNonce((n) => n + 1);
  }, []);

  const handleResetCamera = useCallback(() => {
    setCameraPreset(settings.avatarConfig.defaultCameraPreset ?? 'close-up');
    setResetCameraNonce((n) => n + 1);
  }, [settings.avatarConfig.defaultCameraPreset]);

  const avatarControllerState: AvatarControllerState = useMemo(
    () => ({
      avatarState,
      unifiedState,
      emotion: companionEmotion,
      emotionIntensity,
      previewEmotion,
      activeGesture,
      gestureNonce,
      audioLevel,
      micPermission,
      voiceError,
      glbInspection,
      cameraPreset,
      resetCameraNonce,
      isExpressionsOpen,
    }),
    [
      avatarState,
      unifiedState,
      companionEmotion,
      emotionIntensity,
      previewEmotion,
      activeGesture,
      gestureNonce,
      audioLevel,
      micPermission,
      voiceError,
      glbInspection,
      cameraPreset,
      resetCameraNonce,
      isExpressionsOpen,
    ]
  );

  const avatarControllerActions: AvatarControllerActions = useMemo(
    () => ({
      onTapAvatar: stableOnTapAvatar,
      onInterrupt: handleInterrupt,
      onSelectPreviewEmotion: setPreviewEmotion,
      onTriggerGesture: triggerAvatarGesture,
      onResetPose: handleResetPose,
      onInspectionComplete: setGlbInspection,
      onChangeCameraPreset: handleChangeCameraPreset,
      onResetCamera: handleResetCamera,
      onSetExpressionsOpen: setIsExpressionsOpen,
    }),
    [
      stableOnTapAvatar,
      handleInterrupt,
      triggerAvatarGesture,
      handleResetPose,
      handleChangeCameraPreset,
      handleResetCamera,
    ]
  );

  // Preserve reference to requestCompanionBehavior for external/future hooks cleanly
  void requestCompanionBehavior;

  return (
    <GameShell
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      memoriesCount={memories.length}
      theme={settings.theme}
      userName={settings.userName}
      xp={progress.xp}
      onToggleTheme={handleToggleTheme}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 right-4 sm:right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 dark:bg-[#0b1528]/95 border border-slate-200 dark:border-blue-400/30 text-slate-900 dark:text-white text-xs font-medium shadow-2xl backdrop-blur-md animate-fadeIn max-w-[90vw]"
        >
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Session History Slide-Over Drawer */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={(id) => {
          cancelActiveTurn();
          setActiveConvId(id);
          storage.setActiveConversationId(id);
          speechService.stopSpeaking();
          speechService.stopRecognition();
          setIsSpeaking(false);
          setAvatarState('idle');
          setSuggestedMemory(null);
          setChatError(null);
          const selected = conversations.find((c) => c.id === id);
          const lastModel = selected?.messages
            ? [...selected.messages].reverse().find((m) => m.role === 'model')
            : undefined;
          setAiSpokenText(lastModel ? lastModel.content : '');
          setUserTranscript('');
        }}
        onNewChat={handleNewChat}
        onDeleteChat={(id) => {
          if (id === activeConvId) {
            cancelActiveTurn();
            speechService.stopSpeaking();
            speechService.stopRecognition();
            setIsSpeaking(false);
            setAvatarState('idle');
            setChatError(null);
          }
          setDraftsBySession((prev) => {
            if (!(id in prev)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
          storage.deleteConversation(id);
          const remaining = storage.getConversations();
          if (remaining.length === 0) {
            const fresh = storage.createConversation(settings.personality, settings.language);
            setConversations([fresh]);
            setActiveConvId(fresh.id);
            setAiSpokenText('');
          } else {
            setConversations(remaining);
            const nextId = storage.getActiveConversationId();
            setActiveConvId(nextId);
            const nextConv = remaining.find((c) => c.id === nextId);
            const lastModel = nextConv?.messages
              ? [...nextConv.messages].reverse().find((m) => m.role === 'model')
              : undefined;
            setAiSpokenText(lastModel ? lastModel.content : '');
          }
          showToast('Session deleted');
        }}
        onRenameChat={(id, title) => {
          storage.updateConversation(id, { title });
          setConversations(storage.getConversations());
          showToast('Session renamed');
        }}
        onClearAll={handleClearAllConversations}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {activeTab === 'home' && (
        <HomeScreen
          settings={settings}
          avatarControllerState={avatarControllerState}
          avatarControllerActions={avatarControllerActions}
          avatarState={avatarState}
          companionEmotion={companionEmotion}
          previewEmotion={previewEmotion}
          micPermission={micPermission}
          isKeyConfigured={systemStatus.isKeyConfigured}
          xp={progress.xp}
          prefersReducedMotion={prefersReducedMotion}
          speechBubbleText={speechBubbleText}
          showFirstTimeHint={showFirstTimeHint}
          userTranscript={userTranscript}
          aiSpokenText={aiSpokenText}
          voiceError={voiceError}
          chatError={chatError}
          isMicMuted={isMicMuted}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          isChatDrawerOpen={isChatDrawerOpen}
          sessionTitle={currentConversation?.title || 'New Conversation'}
          messages={messages}
          suggestedMemory={suggestedMemory}
          onDismissBubble={() => setSpeechBubbleText(null)}
          onDismissHint={dismissHint}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onNewChat={handleNewChat}
          onToggleSound={handleToggleSound}
          onToggleTheme={handleToggleTheme}
          onChangeLanguage={(lang) => handleSaveSettings({ ...settings, language: lang })}
          onOpenSettings={() => handleSelectTab('settings')}
          onNavigatePlay={() => handleSelectTab('play')}
          onNavigateWardrobe={() => handleSelectTab('wardrobe')}
          onSendMessage={handleSendMessage}
          onRetryLastMessage={handleRetryLastMessage}
          onDismissChatError={handleDismissChatError}
          onDismissVoiceError={handleDismissVoiceError}
          onToggleListen={handleToggleListen}
          onToggleMute={handleToggleMute}
          onInterrupt={handleInterrupt}
          onEndCall={handleEndCall}
          onRetryMic={handleRetryMic}
          onToggleChatDrawer={() => setIsChatDrawerOpen((prev) => !prev)}
          onSaveSuggestedMemory={(candidateText) => {
            handleAddMemory({
              content: candidateText,
              category: 'preference',
              approvedByUser: true,
              sourceText: candidateText,
            });
            setSuggestedMemory(null);
          }}
          onDismissMemorySuggestion={() => setSuggestedMemory(null)}
          onQuickReaction={(emotion, label, line, gesture) =>
            triggerCompanionReaction(
              emotion,
              label,
              line,
              false,
              gesture ?? 'none',
              gesture === 'wave' ? 'greeting' : undefined
            )
          }
          draftText={currentComposerDraft}
          onDraftChange={updateCurrentComposerDraft}
        />
      )}

      {activeTab === 'play' && (
        <GameHub
          progress={progress}
          soundEnabled={isSoundEnabled}
          prefersReducedMotion={prefersReducedMotion}
          onCompleteGame={handleCompleteGame}
          onReturnHome={() => handleSelectTab('home')}
        />
      )}

      {activeTab === 'wardrobe' && (
        <WardrobeScreen
          config={settings.avatarConfig}
          roomConfig={settings.roomConfig}
          draftAvatar={wardrobeDraftAvatar}
          draftRoom={wardrobeDraftRoom}
          onDraftChange={(nextAvatar, nextRoom) => {
            setWardrobeDraftAvatar(nextAvatar);
            setWardrobeDraftRoom(nextRoom);
          }}
          progress={progress}
          glbInspection={glbInspection}
          previewEmotion={previewEmotion}
          activeCameraPreset={cameraPreset}
          onSelectPreviewEmotion={setPreviewEmotion}
          onChangeCameraPreset={handleChangeCameraPreset}
          onResetCamera={handleResetCamera}
          onPreviewOnStage={() => {
            if (hasUnsavedWardrobeChanges) {
              handleApplyWardrobe(wardrobeDraftAvatar, wardrobeDraftRoom);
            }
            executeSelectTab('home');
          }}
          onApplyWardrobe={handleApplyWardrobe}
          onNavigatePlay={() => handleSelectTab('play')}
        />
      )}

      {activeTab === 'memories' && (
        <MemoriesScreen
          memories={memories}
          memoryEnabled={settings.memoryEnabled}
          conversationsCount={conversations.length}
          onToggleMemoryEnabled={handleToggleMemoryEnabled}
          onAddMemory={handleAddMemory}
          onUpdateMemory={handleUpdateMemory}
          onDeleteMemory={handleDeleteMemory}
          onClearAllMemories={handleClearAllMemories}
          onClearAllConversations={handleClearAllConversations}
          onUnsavedChange={setHasUnsavedMemoryDraft}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsScreen
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onDataRestored={handleRestoreData}
          onClearAllConversations={handleClearAllConversations}
          isApiKeyConfigured={systemStatus.isKeyConfigured}
        />
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      {pendingNavTab && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-dialog-title"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0c1528] border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/35 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2
                  id="unsaved-dialog-title"
                  className="text-sm font-bold text-slate-900 dark:text-white"
                >
                  {activeTab === 'wardrobe'
                    ? 'Unsaved customization changes'
                    : 'Unsaved memory draft'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeTab === 'wardrobe'
                    ? 'You have unapplied changes in Customize. Would you like to apply them before leaving, or discard them?'
                    : 'You have an unsubmitted memory draft open. Leaving now will discard the unsaved text.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingNavTab(null)}
                className="h-9 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Stay Here
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingNavTab;
                  setPendingNavTab(null);
                  if (activeTab === 'wardrobe') {
                    setWardrobeDraftAvatar(settings.avatarConfig);
                    setWardrobeDraftRoom(savedRoomConfig);
                  }
                  if (activeTab === 'memories') {
                    setHasUnsavedMemoryDraft(false);
                  }
                  executeSelectTab(target);
                }}
                className="h-9 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-500/40 text-xs font-semibold text-rose-700 dark:text-rose-200 cursor-pointer"
              >
                Discard &amp; Leave
              </button>
              {activeTab === 'wardrobe' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = pendingNavTab;
                    setPendingNavTab(null);
                    handleApplyWardrobe(wardrobeDraftAvatar, wardrobeDraftRoom);
                    executeSelectTab(target);
                  }}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
                >
                  Apply &amp; Leave
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Full Scrollable Chat & Code Notes Drawer (Mobile/Tablet) */}
      <ChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={messages}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
        chatError={chatError}
        onRetryLastMessage={handleRetryLastMessage}
        onDismissChatError={handleDismissChatError}
        onInterrupt={handleInterrupt}
        settings={settings}
        onSendMessage={handleSendMessage}
        onChangeLanguage={(lang) => handleSaveSettings({ ...settings, language: lang })}
        onSaveSuggestedMemory={(candidateText) => {
          handleAddMemory({
            content: candidateText,
            category: 'preference',
            approvedByUser: true,
            sourceText: candidateText,
          });
          setSuggestedMemory(null);
        }}
        suggestedMemory={suggestedMemory}
        onDismissMemorySuggestion={() => setSuggestedMemory(null)}
        draftText={currentComposerDraft}
        onDraftChange={updateCurrentComposerDraft}
      />
    </GameShell>
  );
}
