import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ActiveNavTab,
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
  UserProfile,
} from './types/companion';
import { DEFAULT_ROOM_CONFIG, storage } from './services/storage';
import { api } from './services/api';
import { speechService } from './services/speech';
import { playGameSound } from './services/gameAudio';

// Shell, Onboarding & Primary Screens (4 Primary Navigation Sections)
import { GameShell } from './components/Game/GameShell';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import { HomeScreen } from './components/Home/HomeScreen';
import { HistoryScreen } from './components/History/HistoryScreen';
import { GameHub } from './components/Play/GameHub';
import { SettingsScreen, SettingsSectionId } from './components/Settings/SettingsScreen';

// Companion Controllers & Drawers
import {
  AvatarControllerActions,
  AvatarControllerState,
  AvatarGesture,
  CameraPreset,
  useMicrophonePermission,
} from './components/Avatar/AvatarController';
import { SpeechGesturePlan, UnifiedAnimationController } from './components/Avatar/UnifiedAnimationController';
import {
  normalizeAvatarEmotion,
  normalizeAvatarGestureHint,
  normalizeEmotionIntensity,
} from './components/Avatar/expressionRig';
import type { GlbInspectionReport } from './components/Avatar/RealisticAvatar';
import { ConversationSidebar } from './components/Sidebar/ConversationSidebar';
import { ChatDrawer } from './components/Chat/ChatDrawer';
import { ToastBanner } from './components/Layout/ToastBanner';
import { UnsavedChangesDialog } from './components/Layout/UnsavedChangesDialog';
import { useSystemPreferences } from './hooks/useSystemPreferences';
import { useToast } from './hooks/useToast';
import { pathnameForTab, resolveTabFromPathname } from './utils/navigation';

export default function App() {
  // Navigation & Game Progression State (synced with URL pathname for direct-route refresh)
  const [activeTab, setActiveTab] = useState<ActiveNavTab>(() =>
    typeof window !== 'undefined' ? resolveTabFromPathname(window.location.pathname) : 'home'
  );
  const [progress, setProgress] = useState<GameProgress>(() => storage.getProgress());
  const [showFirstTimeHint, setShowFirstTimeHint] = useState<boolean>(
    () => !storage.isHomeHintDismissed()
  );
  const [speechBubbleText, setSpeechBubbleText] = useState<string | null>(null);

  // Core Companion Persistence State
  const [settings, setSettings] = useState<CompanionSettings>(() => storage.getSettings());
  const [profile, setProfile] = useState<UserProfile>(() => storage.getProfile());
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !storage.getProfile().onboardingCompleted
  );
  const [themePreviewOverride, setThemePreviewOverride] = useState<'auto' | 'dark' | 'light' | null>(null);
  const [conversations, setConversations] = useState<ConversationSession[]>(storage.getConversations());
  const [activeConvId, setActiveConvId] = useState<string | null>(storage.getActiveConversationId());
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
  const { toastMessage, showToast } = useToast();
  const prefersReducedMotion = useSystemPreferences(settings.theme, themePreviewOverride);
  const [glbInspection, setGlbInspection] = useState<GlbInspectionReport | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeGesture, setActiveGesture] = useState<AvatarGesture>('none');
  const [gestureNonce, setGestureNonce] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>(
    () => settings.avatarConfig.defaultCameraPreset ?? 'close-up'
  );
  const [resetCameraNonce, setResetCameraNonce] = useState<number>(0);
  const [isExpressionsOpen, setIsExpressionsOpen] = useState<boolean>(false);
  const [speechPlan, setSpeechPlan] = useState<SpeechGesturePlan | null>(null);

  // Preserved Drafts, Settings Deep-Link & Unsaved Changes Guard
  const [draftsBySession, setDraftsBySession] = useState<Record<string, string>>({});
  const [wardrobeDraftAvatar, setWardrobeDraftAvatar] = useState<AvatarAppearanceConfig>(
    settings.avatarConfig
  );
  const [wardrobeDraftRoom, setWardrobeDraftRoom] = useState<RoomConfig>(
    settings.roomConfig ?? DEFAULT_ROOM_CONFIG
  );
  const [settingsNavRequest, setSettingsNavRequest] = useState<{
    section: SettingsSectionId;
    openCustomizer?: boolean;
    nonce: number;
  } | null>(null);
  const [pendingNavTab, setPendingNavTab] = useState<ActiveNavTab | null>(null);
  const [hasUnsavedSettingsTab, setHasUnsavedSettingsTab] = useState(false);
  const [activeReplayMessageId, setActiveReplayMessageId] = useState<string | null>(null);

  const [micPermission, refreshMicPermission, markMicDenied] = useMicrophonePermission();

  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRecognizedTranscriptRef = useRef<string>('');
  const manualStopListeningRef = useRef<boolean>(false);
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
      setAvatarState(snap.avatarState);
      setCompanionEmotion(snap.emotion);
      setEmotionIntensity(snap.emotionIntensity);
      setActiveGesture(snap.activeGesture);
      setGestureNonce(snap.gestureNonce);
      setSpeechPlan(snap.activeSpeechPlan);
    });
    return unsub;
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
    setActiveReplayMessageId(null);
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
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, []);

  // 2. Audio Level Sync for 2D aura / mouth indicator (state lifecycle owned strictly by playback callbacks)
  useEffect(() => {
    speechService.setAudioLevelCallback((level) => {
      setAudioLevel(level);
      if (level <= 0.05 && !speechService.getIsSpeaking()) {
        setIsSpeaking(false);
      }
    });

    return () => {
      speechService.setAudioLevelCallback(null);
    };
  }, []);

  const currentConversation = conversations.find((c) => c.id === activeConvId);
  const messages = currentConversation?.messages || [];

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
    (tab: ActiveNavTab, options: { syncHistory?: boolean } = {}) => {
      if (tab !== 'home' && avatarStateRef.current === 'listening') {
        manualStopListeningRef.current = true;
        latestRecognizedTranscriptRef.current = '';
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
      if (tab !== 'settings') {
        setHasUnsavedSettingsTab(false);
      }
      if (options.syncHistory !== false && typeof window !== 'undefined') {
        const targetPath = pathnameForTab(tab);
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ tab }, '', targetPath);
        }
      }
      setActiveTab(tab);
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targetInitial = pathnameForTab(activeTab);
    if (window.location.pathname !== targetInitial) {
      window.history.replaceState({ tab: activeTab }, '', targetInitial);
    }
    const onPopState = () => {
      const nextTab = resolveTabFromPathname(window.location.pathname);
      executeSelectTab(nextTab, { syncHistory: false });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [executeSelectTab]);

  const handleSelectTab = (tab: ActiveNavTab) => {
    if (tab === activeTab) return;
    if (activeTab === 'settings' && (hasUnsavedWardrobeChanges || hasUnsavedSettingsTab)) {
      setPendingNavTab(tab);
      return;
    }
    executeSelectTab(tab);
  };

  const openSettingsSection = (section: SettingsSectionId, openCustomizer = false) => {
    setSettingsNavRequest((prev) => ({
      section,
      openCustomizer,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
    executeSelectTab('settings');
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
      animControllerRef.current?.setError();
      showToast(msg);
      return;
    }

    dismissHint();
    cancelActiveTurn();
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
    setUserTranscript('');

    const langLocale: 'hi-IN' | 'en-IN' = settings.language === 'hi' ? 'hi-IN' : 'en-IN';

    const started = speechService.startRecognition(langLocale, {
      onStart: () => {
        if (turnEpochRef.current !== epochAtStart) return;
        manualStopListeningRef.current = false;
        latestRecognizedTranscriptRef.current = '';
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
      onResult: (transcript, isFinal) => {
        if (turnEpochRef.current !== epochAtStart) return;
        const cleanTranscript = transcript.trim();
        latestRecognizedTranscriptRef.current = cleanTranscript;
        setUserTranscript(transcript);

        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }

        if (!cleanTranscript) return;
        const debounceMs = isFinal ? 450 : 1300;
        speechTimeoutRef.current = setTimeout(() => {
          speechTimeoutRef.current = null;
          const pending = latestRecognizedTranscriptRef.current.trim();
          if (
            turnEpochRef.current === epochAtStart &&
            pending &&
            !manualStopListeningRef.current &&
            !isProcessingRef.current
          ) {
            latestRecognizedTranscriptRef.current = '';
            handleSendMessage(pending);
          }
        }, debounceMs);
      },
      onError: (err) => {
        if (turnEpochRef.current !== epochAtStart) return;
        latestRecognizedTranscriptRef.current = '';
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
        animControllerRef.current?.setError();
        showToast(err);
      },
      onEnd: () => {
        if (turnEpochRef.current !== epochAtStart) return;
        const pending = latestRecognizedTranscriptRef.current.trim();
        if (
          pending &&
          !manualStopListeningRef.current &&
          !isProcessingRef.current &&
          !speechService.getIsSpeaking()
        ) {
          if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current);
            speechTimeoutRef.current = null;
          }
          latestRecognizedTranscriptRef.current = '';
          handleSendMessage(pending);
          return;
        }
        if (!isProcessingRef.current && !speechService.getIsSpeaking() && avatarStateRef.current === 'listening') {
          animControllerRef.current?.returnToIdle();
          setAvatarState('idle');
        }
      },
    });

    if (!started) {
      const msg = 'Speech recognition unavailable. You can type below.';
      setVoiceError(msg);
      animControllerRef.current?.setError();
      showToast(msg);
    }
  };

  const stopListeningTurn = () => {
    manualStopListeningRef.current = true;
    latestRecognizedTranscriptRef.current = '';
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
    if (avatarState === 'speaking' || avatarState === 'preparing_audio') {
      cancelActiveTurn();
      speechService.stopSpeaking();
      setIsSpeaking(false);
    }
    if (avatarState === 'listening') {
      const pending = (latestRecognizedTranscriptRef.current || userTranscript).trim();
      if (pending) {
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
        latestRecognizedTranscriptRef.current = '';
        handleSendMessage(pending);
      } else {
        stopListeningTurn();
      }
    } else {
      manualStopListeningRef.current = false;
      startListeningTurn(true);
    }
  };

  const handleRetryMic = () => {
    setVoiceError(null);
    animControllerRef.current?.returnToIdle();
    refreshMicPermission();
    manualStopListeningRef.current = false;
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
      cancelActiveTurn();
      speechService.stopSpeaking();
      setIsSpeaking(false);
      if (
        avatarStateRef.current === 'speaking' ||
        avatarStateRef.current === 'preparing_audio'
      ) {
        animControllerRef.current?.returnToIdle();
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
    speechService.stopSpeaking();
    speechService.stopRecognition();
    setIsSpeaking(false);
    animControllerRef.current?.interrupt(450);
    showToast('Speech stopped');
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

  // Phase 5: Session-once App-Open Greeting when app is ready & 3D avatar finishes loading
  const avatarType = settings.avatarConfig.avatarType ?? '3d-glb';
  const isAvatarReady = avatarType === '3d-glb' ? Boolean(glbInspection) : true;

  useEffect(() => {
    if (showOnboarding || !isAppReady || !isAvatarReady || activeTab !== 'home') return;
    if (isProcessingRef.current || speechService.getIsSpeaking()) return;

    const ctrl = animControllerRef.current;
    if (!ctrl) return;

    const trimmedUser = (profile.displayName || settings.userName || '').trim();
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
                ctrl.finishAppOpenSpeech();
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
                        ctrl.finishAppOpenSpeech();
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
    showOnboarding,
    isAppReady,
    isAvatarReady,
    activeTab,
    profile.displayName,
    settings.userName,
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
    cancelActiveTurn();
    playGameSound('tap', isSoundEnabled);
    setAiSpokenText(line);
    showSpeechBubble(line);

    const { progress: nextProg, newlyUnlockedRooms } = storage.recordInteraction(activityLabel, 5);
    setProgress(nextProg);
    if (newlyUnlockedRooms.length > 0) {
      showToast('New room theme unlocked in Settings → Appearance!');
    }

    const ctrl = animControllerRef.current;
    const reactionEpoch = turnEpochRef.current;

    if (speakLine && isSoundEnabled) {
      const dispatchRes = ctrl?.dispatch({
        animationState: explicitState,
        emotion,
        gesture,
        intensity: 0.78,
        force: true,
        source: 'user-action',
      });
      let speechReqId = dispatchRes?.requestId;
      speechService.speakWithBrowserTTS(
        line,
        settings.language === 'hi' ? 'hi-IN' : 'en-IN',
        settings.speechRate,
        () => {
          if (turnEpochRef.current !== reactionEpoch) return;
          setIsSpeaking(false);
          ctrl?.endSpeechSession();
          if (explicitState === 'greeting') {
            ctrl?.finishGreetingSpeech(speechReqId);
          } else {
            ctrl?.returnToIdle(speechReqId);
          }
        },
        () => {
          if (turnEpochRef.current !== reactionEpoch) return;
          const startRes = ctrl?.dispatch({
            animationState: 'speaking',
            emotion,
            intensity: 0.78,
            force: true,
            source: 'user-action',
          });
          if (startRes?.accepted) {
            speechReqId = startRes.requestId;
          }
          ctrl?.beginSpeechSession({
            text: line,
            emotion,
            speechRate: settings.speechRate,
            requestId: speechReqId,
          });
          setIsSpeaking(true);
        }
      );
    } else {
      ctrl?.dispatch({
        animationState: explicitState,
        emotion,
        gesture,
        intensity: 0.78,
        durationMs: 2800,
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
    triggerCompanionReaction('smile', 'Greeted Ātmiya', picked, true, 'wave', 'greeting');
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

      // Strictly use explicit backend emotion/gesture metadata (controlled mapping, neutral fallback)
      const replyEmotion: AvatarEmotion = normalizeAvatarEmotion(response.emotion);
      const nextIntensity = normalizeEmotionIntensity(response.intensity, 0.7);
      const gestureHint = normalizeAvatarGestureHint(response.gesture);

      const aiMessage: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'model',
        content: replyText,
        emotion: replyEmotion,
        emotionIntensity: nextIntensity,
        gestureHint,
        timestamp: Date.now(),
      };

      const updatedMsgs = [...currentMsgs, aiMessage];
      storage.updateConversation(activeConvId, {
        messages: updatedMsgs,
      });
      setConversations(storage.getConversations());

      setIsThinking(false);
      isProcessingRef.current = false;

      if (isSoundEnabled) {
        // Hold calm emotional expression in explicit preparing_audio state while TTS fetches/decodes
        animControllerRef.current?.dispatch({
          animationState: 'preparing_audio',
          emotion: replyEmotion,
          intensity: nextIntensity,
          gestureHint,
          force: true,
          source: 'conversation',
        });
        setAvatarState('preparing_audio');

        let speechDispatchId: number | undefined;

        const onPlaybackStart = () => {
          if (turnEpochRef.current !== myEpoch) return;
          const speechDispatch = animControllerRef.current?.dispatch({
            animationState: 'speaking',
            emotion: replyEmotion,
            intensity: nextIntensity,
            gestureHint,
            force: true,
            source: 'conversation',
          });
          speechDispatchId = speechDispatch?.requestId;
          animControllerRef.current?.beginSpeechSession({
            text: replyText,
            emotion: replyEmotion,
            gestureHint,
            speechRate: settings.speechRate,
            requestId: speechDispatchId,
          });
          setAvatarState('speaking');
          setIsSpeaking(true);
        };

        const onFinish = () => {
          if (turnEpochRef.current !== myEpoch) return;
          setIsSpeaking(false);
          animControllerRef.current?.endSpeechSession();
          animControllerRef.current?.returnToIdle(speechDispatchId);
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
              await speechService.playWavAudio(
                ttsRes.audioBase64,
                onFinish,
                () => {
                  if (turnEpochRef.current !== myEpoch) return;
                  speechService.speakWithBrowserTTS(
                    replyText,
                    settings.language,
                    settings.speechRate,
                    onFinish,
                    onPlaybackStart
                  );
                },
                {
                  text: replyText,
                  lang: settings.language,
                  rate: settings.speechRate,
                  onStart: onPlaybackStart,
                }
              );
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
          onFinish,
          onPlaybackStart
        );
      } else {
        // Sound off: display resolved emotion pose & gesture cue briefly, then return cleanly to idle/neutral
        const silentGesture: AvatarGesture | undefined =
          gestureHint === 'wave'
            ? 'wave'
            : gestureHint === 'gentle_nod' || gestureHint === 'nod' || replyEmotion === 'encouraging'
            ? 'nod'
            : undefined;
        animControllerRef.current?.dispatch({
          emotion: replyEmotion,
          intensity: nextIntensity,
          gesture: silentGesture,
          gestureHint,
          durationMs: 2800,
          force: true,
          source: 'conversation',
        });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || turnEpochRef.current !== myEpoch) {
        return;
      }
      console.warn('Recoverable chat turn failure:', err?.message || err);
      setIsThinking(false);
      isProcessingRef.current = false;
      animControllerRef.current?.setError();
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
      animControllerRef.current?.returnToIdle();
    }
  };

  const handleDismissVoiceError = () => {
    setVoiceError(null);
    if (!isProcessingRef.current && avatarStateRef.current === 'error') {
      animControllerRef.current?.returnToIdle();
    }
  };

  const handleReplayMessage = useCallback(
    async (msg: ChatMessage) => {
      if (isProcessingRef.current) return;

      if (activeReplayMessageId === msg.id) {
        cancelActiveTurn();
        speechService.stopSpeaking();
        setIsSpeaking(false);
        animControllerRef.current?.returnToIdle();
        setAvatarState('idle');
        return;
      }

      const cleanText = (msg.content || '').trim();
      if (!cleanText) return;

      if (showFirstTimeHint) {
        setShowFirstTimeHint(false);
        storage.dismissHomeHint();
      }
      cancelActiveTurn();
      const myEpoch = turnEpochRef.current;
      const abortController = new AbortController();
      activeAbortRef.current = abortController;

      setPreviewEmotion(null);
      setVoiceError(null);
      setChatError(null);
      speechService.stopRecognition();
      speechService.stopSpeaking();

      const replayEmotion: AvatarEmotion = normalizeAvatarEmotion(msg.emotion);
      const replayIntensity = normalizeEmotionIntensity(msg.emotionIntensity, 0.7);
      const replayGestureHint = normalizeAvatarGestureHint(msg.gestureHint);

      setActiveReplayMessageId(msg.id);
      setAiSpokenText(cleanText);

      animControllerRef.current?.dispatch({
        animationState: 'preparing_audio',
        emotion: replayEmotion,
        intensity: replayIntensity,
        gestureHint: replayGestureHint,
        force: true,
        source: 'user-action',
      });
      setAvatarState('preparing_audio');

      let speechDispatchId: number | undefined;

      const onPlaybackStart = () => {
        if (turnEpochRef.current !== myEpoch) return;
        const speechDispatch = animControllerRef.current?.dispatch({
          animationState: 'speaking',
          emotion: replayEmotion,
          intensity: replayIntensity,
          gestureHint: replayGestureHint,
          force: true,
          source: 'user-action',
        });
        speechDispatchId = speechDispatch?.requestId;
        animControllerRef.current?.beginSpeechSession({
          text: cleanText,
          emotion: replayEmotion,
          gestureHint: replayGestureHint,
          speechRate: settings.speechRate,
          requestId: speechDispatchId,
        });
        setAvatarState('speaking');
        setIsSpeaking(true);
      };

      const onFinish = () => {
        if (turnEpochRef.current !== myEpoch) return;
        setIsSpeaking(false);
        setActiveReplayMessageId(null);
        animControllerRef.current?.endSpeechSession();
        animControllerRef.current?.returnToIdle(speechDispatchId);
        setAvatarState('idle');
      };

      try {
        if (settings.voiceEngine === 'gemini-native' && !api.isTtsInCooldown()) {
          try {
            const ttsRes = await api.generateTTS(
              {
                text: cleanText,
                voice: settings.selectedVoice || 'Kore',
              },
              abortController.signal
            );

            if (turnEpochRef.current !== myEpoch || abortController.signal.aborted) {
              return;
            }

            if (ttsRes.audioBase64) {
              await speechService.playWavAudio(
                ttsRes.audioBase64,
                onFinish,
                () => {
                  if (turnEpochRef.current !== myEpoch) return;
                  speechService.speakWithBrowserTTS(
                    cleanText,
                    settings.language,
                    settings.speechRate,
                    onFinish,
                    onPlaybackStart
                  );
                },
                {
                  text: cleanText,
                  lang: settings.language,
                  rate: settings.speechRate,
                  onStart: onPlaybackStart,
                }
              );
              return;
            }
          } catch (e: any) {
            if (e?.name === 'AbortError' || turnEpochRef.current !== myEpoch) {
              return;
            }
            console.warn('Replay TTS fallback:', e?.message || e);
          }
        }

        if (turnEpochRef.current !== myEpoch) return;
        speechService.speakWithBrowserTTS(
          cleanText,
          settings.language,
          settings.speechRate,
          onFinish,
          onPlaybackStart
        );
      } finally {
        if (activeAbortRef.current === abortController) {
          activeAbortRef.current = null;
        }
      }
    },
    [
      activeReplayMessageId,
      cancelActiveTurn,
      settings.language,
      settings.selectedVoice,
      settings.speechRate,
      settings.voiceEngine,
      showFirstTimeHint,
    ]
  );

  // Desktop keyboard shortcuts on Home (latest state/callbacks via ref to prevent listener churn)
  const keyboardShortcutsRef = useRef<{
    activeTab: ActiveNavTab;
    pendingNavTab: ActiveNavTab | null;
    isChatDrawerOpen: boolean;
    isSidebarOpen: boolean;
    isSpeakingOrPreparing: boolean;
    handleInterrupt: () => void;
    handleToggleListen: () => void;
    handleTapAvatar: () => void;
  } | null>(null);
  keyboardShortcutsRef.current = {
    activeTab,
    pendingNavTab,
    isChatDrawerOpen,
    isSidebarOpen,
    isSpeakingOrPreparing: isSpeaking || avatarState === 'preparing_audio',
    handleInterrupt,
    handleToggleListen,
    handleTapAvatar,
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctx = keyboardShortcutsRef.current;
      if (!ctx) return;

      if (e.key === 'Escape') {
        if (ctx.pendingNavTab) setPendingNavTab(null);
        else if (ctx.isChatDrawerOpen) setIsChatDrawerOpen(false);
        else if (ctx.isSidebarOpen) setIsSidebarOpen(false);
        else if (ctx.isSpeakingOrPreparing) ctx.handleInterrupt();
        return;
      }

      if (ctx.activeTab !== 'home') return;

      const target = e.target as HTMLElement | null;
      const isTypingField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isTypingField || e.metaKey || e.ctrlKey || e.altKey || ctx.isSidebarOpen) return;

      const key = e.key.toLowerCase();
      if (key === 't') {
        e.preventDefault();
        ctx.handleToggleListen();
      } else if (key === 'c') {
        e.preventDefault();
        setIsChatDrawerOpen((prev) => !prev);
      } else if (key === 'g') {
        e.preventDefault();
        ctx.handleTapAvatar();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Conversation & Settings Handlers
  const handleClearAllConversations = () => {
    cancelActiveTurn();
    speechService.stopSpeaking();
    speechService.stopRecognition();
    animControllerRef.current?.returnToIdle();
    storage.clearAllConversations();
    const fresh = storage.createConversation(settings.personality, settings.language);
    setConversations([fresh]);
    setActiveConvId(fresh.id);
    setDraftsBySession({});
    setAiSpokenText('');
    setUserTranscript('');
    setIsSpeaking(false);
    showToast('Conversation history cleared');
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
    if (toastText) showToast(toastText);
  };

  const handleSaveProfile = (nextProfile: UserProfile, toastText = 'Profile updated'): boolean => {
    const saveResult = storage.saveProfile(nextProfile);
    if (!saveResult.ok) {
      showToast(saveResult.error || 'Could not save profile to local storage');
      return false;
    }
    const stored = storage.getProfile();
    setProfile(stored);
    if (stored.displayName !== (settings.userName || '').trim()) {
      const syncedSettings = { ...settings, userName: stored.displayName };
      setSettings(syncedSettings);
      storage.saveSettings(syncedSettings);
    }
    if (toastText) showToast(toastText);
    return true;
  };

  const handleCompleteOnboarding = (nextProfile: UserProfile, nextSettings: CompanionSettings) => {
    setThemePreviewOverride(null);
    const saveResult = storage.saveProfile(nextProfile);
    if (!saveResult.ok) {
      showToast(saveResult.error || 'Could not save profile to local storage');
      return;
    }
    setProfile(storage.getProfile());
    handleSaveSettings(nextSettings, 'Welcome to Ātmiya');
    if (nextSettings.avatarConfig.defaultCameraPreset) {
      setCameraPreset(nextSettings.avatarConfig.defaultCameraPreset);
      setResetCameraNonce((n) => n + 1);
    }
    setShowOnboarding(false);
    executeSelectTab('home');
  };

  const handleToggleTheme = () => {
    const currentlyDark =
      settings.theme === 'dark' ||
      (settings.theme === 'auto' &&
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const nextTheme = currentlyDark ? 'light' : 'dark';
    const updated: CompanionSettings = { ...settings, theme: nextTheme };
    handleSaveSettings(
      updated,
      nextTheme === 'light' ? 'Switched to Light theme' : 'Switched to Dark / Night theme'
    );
  };

  const handleNewChat = () => {
    const newConv = storage.createConversation(settings.personality, settings.language);
    setConversations(storage.getConversations());
    setActiveConvId(newConv.id);
    handleEndCall();
    setAiSpokenText('');
    showToast('New session started');
  };

  const handleSelectConversation = (id: string) => {
    cancelActiveTurn();
    setActiveConvId(id);
    storage.setActiveConversationId(id);
    speechService.stopSpeaking();
    speechService.stopRecognition();
    animControllerRef.current?.returnToIdle();
    setIsSpeaking(false);
    setChatError(null);
    const selected = conversations.find((c) => c.id === id);
    const lastModel = selected?.messages
      ? [...selected.messages].reverse().find((m) => m.role === 'model')
      : undefined;
    setAiSpokenText(lastModel ? lastModel.content : '');
    setUserTranscript('');
  };

  const handleRenameConversation = (id: string, title: string) => {
    storage.updateConversation(id, { title });
    setConversations(storage.getConversations());
    showToast('Session renamed');
  };

  const handleDeleteConversation = (id: string) => {
    if (id === activeConvId) {
      cancelActiveTurn();
      speechService.stopSpeaking();
      speechService.stopRecognition();
      animControllerRef.current?.returnToIdle();
      setIsSpeaking(false);
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
      showToast(`+${params.xpReward} XP! New room theme unlocked in Settings → Appearance`);
    } else if (newAchievements.length > 0) {
      showToast(`+${params.xpReward} XP! Badge unlocked: ${newAchievements[0].title}`);
    } else {
      showToast(`${params.gameTitle} complete · +${params.xpReward} XP`);
    }
  };

  const handleRestoreData = () => {
    const restoredSettings = storage.getSettings();
    const restoredProfile = storage.getProfile();
    setSettings(restoredSettings);
    setProfile(restoredProfile);
    setWardrobeDraftAvatar(restoredSettings.avatarConfig);
    setWardrobeDraftRoom(restoredSettings.roomConfig ?? DEFAULT_ROOM_CONFIG);
    if (restoredSettings.avatarConfig.defaultCameraPreset) {
      setCameraPreset(restoredSettings.avatarConfig.defaultCameraPreset);
      setResetCameraNonce((n) => n + 1);
    }
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
      speechPlan,
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
      speechPlan,
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

  if (showOnboarding) {
    return (
      <>
        <ToastBanner message={toastMessage} topOffsetClass="top-4" />
        <OnboardingFlow
          initialProfile={profile}
          initialSettings={settings}
          isApiKeyConfigured={systemStatus.isKeyConfigured}
          onPreviewTheme={(t) => setThemePreviewOverride(t)}
          onComplete={handleCompleteOnboarding}
          onContinueExisting={
            profile.onboardingCompleted
              ? () => {
                  setThemePreviewOverride(null);
                  setShowOnboarding(false);
                }
              : undefined
          }
        />
      </>
    );
  }

  return (
    <GameShell
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      profile={profile}
      userName={settings.userName}
    >
      {/* Toast Notification */}
      <ToastBanner message={toastMessage} topOffsetClass="top-16" />

      {/* Session History Slide-Over Drawer */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteConversation}
        onRenameChat={handleRenameConversation}
        onClearAll={handleClearAllConversations}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {activeTab === 'home' && (
        <HomeScreen
          settings={settings}
          profile={profile}
          conversations={conversations}
          activeConvId={activeConvId}
          avatarControllerState={avatarControllerState}
          avatarControllerActions={avatarControllerActions}
          avatarState={avatarState}
          companionEmotion={companionEmotion}
          previewEmotion={previewEmotion}
          micPermission={micPermission}
          isKeyConfigured={systemStatus.isKeyConfigured}
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
          onDismissBubble={() => setSpeechBubbleText(null)}
          onDismissHint={dismissHint}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenHistoryTab={() => handleSelectTab('history')}
          onSelectConversation={handleSelectConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onNewChat={handleNewChat}
          onToggleSound={handleToggleSound}
          onToggleTheme={handleToggleTheme}
          onChangeLanguage={(lang) => handleSaveSettings({ ...settings, language: lang })}
          onOpenSettings={() => openSettingsSection('profile')}
          onRevisitOnboarding={() => setShowOnboarding(true)}
          onNavigatePlay={() => handleSelectTab('play')}
          onNavigateWardrobe={() => openSettingsSection('appearance', true)}
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
          speakingMessageId={activeReplayMessageId}
          onReplayMessage={handleReplayMessage}
        />
      )}

      {activeTab === 'history' && (
        <HistoryScreen
          conversations={conversations}
          activeConvId={activeConvId}
          onResumeSession={(id) => {
            handleSelectConversation(id);
            executeSelectTab('home');
          }}
          onNewSession={() => {
            handleNewChat();
            executeSelectTab('home');
          }}
          onRenameSession={handleRenameConversation}
          onDeleteSession={handleDeleteConversation}
          onClearAll={handleClearAllConversations}
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

      {activeTab === 'settings' && (
        <SettingsScreen
          settings={settings}
          profile={profile}
          conversationsCount={conversations.filter((c) => c.messages.length > 0).length}
          systemStatus={systemStatus}
          onSaveSettings={handleSaveSettings}
          onSaveProfile={handleSaveProfile}
          onDataRestored={handleRestoreData}
          onClearAllConversations={handleClearAllConversations}
          onRevisitOnboarding={() => setShowOnboarding(true)}
          isApiKeyConfigured={systemStatus.isKeyConfigured}
          progress={progress}
          glbInspection={glbInspection}
          previewEmotion={previewEmotion}
          activeCameraPreset={cameraPreset}
          draftAvatar={wardrobeDraftAvatar}
          draftRoom={wardrobeDraftRoom}
          onDraftWardrobeChange={(nextAvatar, nextRoom) => {
            setWardrobeDraftAvatar(nextAvatar);
            setWardrobeDraftRoom(nextRoom);
          }}
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
          requestedSection={settingsNavRequest}
          onDirtyStateChange={setHasUnsavedSettingsTab}
        />
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesDialog
        kind={
          pendingNavTab && activeTab === 'settings'
            ? hasUnsavedWardrobeChanges
              ? 'wardrobe'
              : hasUnsavedSettingsTab
              ? 'settings'
              : null
            : null
        }
        onStay={() => setPendingNavTab(null)}
        onDiscard={() => {
          if (!pendingNavTab) return;
          const target = pendingNavTab;
          setPendingNavTab(null);
          setWardrobeDraftAvatar(settings.avatarConfig);
          setWardrobeDraftRoom(savedRoomConfig);
          setHasUnsavedSettingsTab(false);
          executeSelectTab(target);
        }}
        onApplyAndLeave={
          activeTab === 'settings' && hasUnsavedWardrobeChanges
            ? () => {
                if (!pendingNavTab) return;
                const target = pendingNavTab;
                setPendingNavTab(null);
                handleApplyWardrobe(wardrobeDraftAvatar, wardrobeDraftRoom);
                executeSelectTab(target);
              }
            : undefined
        }
      />

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
        draftText={currentComposerDraft}
        onDraftChange={updateCurrentComposerDraft}
        speakingMessageId={activeReplayMessageId}
        onReplayMessage={handleReplayMessage}
        prefersReducedMotion={prefersReducedMotion}
      />
    </GameShell>
  );
}
