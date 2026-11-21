import React, { useState, useEffect, useRef } from 'react';
import {
  ActiveNavTab,
  AVATAR_EMOTIONS,
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
  UserMemory,
} from './types/companion';
import { storage } from './services/storage';
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
  useMicrophonePermission,
} from './components/Avatar/AvatarController';
import type { GlbInspectionReport } from './components/Avatar/RealisticAvatar';
import { ConversationSidebar } from './components/Sidebar/ConversationSidebar';
import { ChatDrawer } from './components/Chat/ChatDrawer';

import { Check } from 'lucide-react';

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
    model: 'gemini-3.8-flash',
    ttsModel: 'gemini-3.8-flash-lite-tts',
    transcribeModel: 'gemini-3.5-transcribe',
    supportedVoices: ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'],
  });

  // Drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  // Companion Avatar & Voice State
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [companionEmotion, setCompanionEmotion] = useState<AvatarEmotion>('neutral');
  const [emotionIntensity, setEmotionIntensity] = useState<number>(0.7);
  const [previewEmotion, setPreviewEmotion] = useState<AvatarEmotion | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiSpokenText, setAiSpokenText] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [suggestedMemory, setSuggestedMemory] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [glbInspection, setGlbInspection] = useState<GlbInspectionReport | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const [micPermission, refreshMicPermission] = useMicrophonePermission();

  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const avatarStateRef = useRef<AvatarState>(avatarState);
  const turnEpochRef = useRef<number>(0);
  const activeAbortRef = useRef<AbortController | null>(null);

  const isSoundEnabled = settings.voiceEngine !== 'none' && settings.autoSpeakResponse;

  useEffect(() => {
    avatarStateRef.current = avatarState;
  }, [avatarState]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  const cancelActiveTurn = () => {
    turnEpochRef.current += 1;
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
  };

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

    return () => {
      cancelActiveTurn();
      speechService.stopSpeaking();
      speechService.stopRecognition();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, []);

  // 2. Audio Level Sync for avatar mouth/aura animation
  useEffect(() => {
    speechService.setAudioLevelCallback((level) => {
      setAudioLevel(level);
      if (level > 0.05) {
        setIsSpeaking(true);
        if (avatarStateRef.current !== 'speaking') {
          setAvatarState('speaking');
        }
      } else if (!speechService.getIsSpeaking()) {
        setIsSpeaking(false);
        if (avatarStateRef.current === 'speaking') {
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

  const handleSelectTab = (tab: ActiveNavTab) => {
    if (tab !== 'home' && avatarState === 'listening') {
      stopListeningTurn();
    }
    if (tab !== 'home') {
      setIsChatDrawerOpen(false);
      setIsSidebarOpen(false);
    }
    setActiveTab(tab);
  };

  const analyzeEmotion = (text: string): AvatarEmotion => {
    const lower = text.toLowerCase();
    if (lower.includes('haha') || lower.includes('lol')) return 'laughing';
    if (lower.includes('excited') || lower.includes('thrilled') || lower.includes('amazing') || lower.includes('wah')) {
      return 'excited';
    }
    if (lower.includes('sad') || lower.includes('dukh') || lower.includes('cry') || lower.includes('lonely')) {
      return 'sad';
    }
    if (lower.includes('anxious') || lower.includes('stress') || lower.includes('worried') || lower.includes('pareshan')) {
      return 'worried';
    }
    if (lower.includes('depress') || lower.includes('upset') || lower.includes('tough day') || lower.includes('sorry')) {
      return 'empathetic';
    }
    if (lower.includes('disappointed') || lower.includes('failed')) return 'disappointed';
    if (lower.includes('confus') || lower.includes('samajh nahi') || lower.includes('unclear')) {
      return 'confused';
    }
    if (lower.includes('curious') || lower.includes('interesting') || lower.includes('how does')) {
      return 'curious';
    }
    if (
      lower.includes('what?!') ||
      lower.includes('really?') ||
      lower.includes('shock') ||
      lower.includes('sach mein?') ||
      lower.includes('kya sach?') ||
      lower.includes('unbelievable')
    ) {
      return 'surprised';
    }
    if (
      lower.includes('thank') ||
      lower.includes('shukriya') ||
      lower.includes('dhanyawad') ||
      lower.includes('happy') ||
      lower.includes('khush') ||
      lower.includes('great') ||
      lower.includes('awesome') ||
      lower.includes('mast') ||
      lower.includes('love')
    ) {
      return 'happy';
    }
    return 'neutral';
  };

  const startListeningTurn = () => {
    if (isMicMuted || isProcessingRef.current) return;

    dismissHint();
    const epochAtStart = turnEpochRef.current;
    setPreviewEmotion(null);
    setVoiceError(null);
    speechService.stopSpeaking();
    setAvatarState('listening');
    setCompanionEmotion('neutral');
    setUserTranscript('');

    const langLocale: 'hi-IN' | 'en-IN' = settings.language === 'hi' ? 'hi-IN' : 'en-IN';

    const started = speechService.startRecognition(langLocale, {
      onStart: () => {
        if (turnEpochRef.current !== epochAtStart) return;
        setVoiceError(null);
        refreshMicPermission();
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
        refreshMicPermission();
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
    setAvatarState('idle');
  };

  const handleToggleListen = () => {
    if (avatarState === 'listening') {
      if (userTranscript.trim()) {
        handleSendMessage(userTranscript.trim());
      } else {
        stopListeningTurn();
      }
    } else {
      startListeningTurn();
    }
  };

  const handleRetryMic = () => {
    setVoiceError(null);
    setAvatarState('idle');
    refreshMicPermission();
    if (!isMicMuted) {
      startListeningTurn();
    } else {
      setIsMicMuted(false);
      setTimeout(() => startListeningTurn(), 50);
    }
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

  const handleInterrupt = () => {
    cancelActiveTurn();
    const interruptEpoch = turnEpochRef.current;
    speechService.stopSpeaking();
    speechService.stopRecognition();
    setIsSpeaking(false);
    setAvatarState('interrupted');
    setCompanionEmotion('neutral');
    showToast('Speech stopped');

    setTimeout(() => {
      if (turnEpochRef.current !== interruptEpoch) return;
      setAvatarState('idle');
    }, 450);
  };

  const handleEndCall = () => {
    cancelActiveTurn();
    speechService.stopSpeaking();
    speechService.stopRecognition();
    setIsSpeaking(false);
    setVoiceError(null);
    setAvatarState('idle');
    setCompanionEmotion('neutral');
    setUserTranscript('');
    showToast('Turn reset');
  };

  const triggerCompanionReaction = (
    emotion: AvatarEmotion,
    activityLabel: string,
    line: string,
    speakLine = false
  ) => {
    if (isProcessingRef.current || speechService.getIsSpeaking()) return;

    dismissHint();
    playGameSound('tap', isSoundEnabled);
    setAiSpokenText(line);
    showSpeechBubble(line);
    setCompanionEmotion(emotion);
    setEmotionIntensity(0.78);

    const { progress: nextProg, newlyUnlockedRooms } = storage.recordInteraction(activityLabel, 5);
    setProgress(nextProg);
    if (newlyUnlockedRooms.length > 0) {
      showToast('New room theme unlocked in Wardrobe!');
    }

    if (speakLine && isSoundEnabled) {
      setAvatarState('speaking');
      setIsSpeaking(true);
      speechService.speakWithBrowserTTS(
        line,
        settings.language === 'hi' ? 'hi-IN' : 'en-IN',
        settings.speechRate,
        () => {
          setAvatarState('idle');
          setIsSpeaking(false);
          setCompanionEmotion('neutral');
        }
      );
    } else {
      setTimeout(() => {
        if (!isProcessingRef.current && avatarStateRef.current === 'idle') {
          setCompanionEmotion('neutral');
        }
      }, 2400);
    }
  };

  const handleTapAvatar = () => {
    const greetings = [
      'Namaste! Main yahin hoon — bataiye aaj kya chal raha hai?',
      'Hey! Good to see you here. Want to talk or play a quick game?',
      'Haanji! I am right here and listening whenever you are ready.',
    ];
    const picked = greetings[Math.floor(Math.random() * greetings.length)];
    triggerCompanionReaction('smile', 'Greeted Ātmiya', picked, true);
  };

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessingRef.current || !activeConvId) return;

    dismissHint();
    cancelActiveTurn();
    const myEpoch = turnEpochRef.current;
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

    setPreviewEmotion(null);
    setVoiceError(null);
    speechService.stopRecognition();
    speechService.stopSpeaking();

    isProcessingRef.current = true;
    setIsThinking(true);
    setAvatarState('thinking');
    setUserTranscript(trimmed);

    const detectedEmotion = analyzeEmotion(trimmed);
    setCompanionEmotion(detectedEmotion === 'neutral' ? 'thinking' : detectedEmotion);
    setEmotionIntensity(0.65);

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const currentMsgs = [...messages, userMessage];
    storage.updateConversation(activeConvId, {
      messages: currentMsgs,
      title: messages.length === 0 ? trimmed.slice(0, 36) : (currentConversation?.title || 'Companion Session'),
    });
    setConversations(storage.getConversations());

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

      const replyText = response.reply || '';
      if (!replyText.trim()) {
        throw new Error('Empty response received from assistant.');
      }
      setAiSpokenText(replyText);
      const shortPreview =
        replyText.length <= 110 ? replyText : `${replyText.slice(0, 107).trim()}...`;
      showSpeechBubble(shortPreview, 5000);

      const backendEmotion =
        response.emotion && (AVATAR_EMOTIONS as readonly string[]).includes(response.emotion)
          ? response.emotion
          : null;
      const replyEmotion: AvatarEmotion = backendEmotion ?? analyzeEmotion(replyText);
      const nextIntensity =
        typeof response.intensity === 'number' && !Number.isNaN(response.intensity)
          ? Math.max(0.2, Math.min(1, response.intensity))
          : 0.7;

      setCompanionEmotion(replyEmotion !== 'neutral' ? replyEmotion : detectedEmotion);
      setEmotionIntensity(nextIntensity);

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
        setAvatarState('speaking');
        setIsSpeaking(true);

        const onFinish = () => {
          if (turnEpochRef.current !== myEpoch) return;
          setAvatarState('idle');
          setIsSpeaking(false);
          setCompanionEmotion('neutral');
          setEmotionIntensity(0.7);

          if (settings.handsFreeMode && !isMicMuted && activeTab === 'home') {
            setTimeout(() => {
              if (turnEpochRef.current === myEpoch && !isProcessingRef.current && !speechService.getIsSpeaking()) {
                startListeningTurn();
              }
            }, 600);
          }
        };

        if (settings.voiceEngine === 'gemini-native') {
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
            console.warn('TTS playback error, trying browser fallback:', e);
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
        setAvatarState('idle');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || turnEpochRef.current !== myEpoch) {
        return;
      }
      console.error('Failed to send message:', err);
      setIsThinking(false);
      isProcessingRef.current = false;
      setAvatarState('error');
      setCompanionEmotion('neutral');
      setVoiceError(err?.message || 'Connection failed');
      showToast('Error: ' + (err.message || 'Connection failed'));
    } finally {
      if (activeAbortRef.current === abortController) {
        activeAbortRef.current = null;
      }
    }
  };

  // Desktop keyboard shortcuts on Home
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isChatDrawerOpen) setIsChatDrawerOpen(false);
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
    setSettings(newSettings);
    storage.saveSettings(newSettings);
    showToast(toastText);
  };

  const handleApplyWardrobe = (newAvatar: AvatarAppearanceConfig, newRoom: RoomConfig) => {
    const updated: CompanionSettings = {
      ...settings,
      avatarConfig: newAvatar,
      roomConfig: newRoom,
    };
    setSettings(updated);
    storage.saveSettings(updated);
    showToast('Wardrobe & room look applied');
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
      showToast(`+${params.xpReward} XP! New room theme unlocked in Wardrobe`);
    } else if (newAchievements.length > 0) {
      showToast(`+${params.xpReward} XP! Badge unlocked: ${newAchievements[0].title}`);
    } else {
      showToast(`${params.gameTitle} complete · +${params.xpReward} XP`);
    }
  };

  const handleRestoreData = () => {
    setSettings(storage.getSettings());
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
      const fresh = storage.createConversation(settings.personality, settings.language);
      setConversations([fresh]);
      setActiveConvId(fresh.id);
    }
    showToast('Backup restored successfully');
  };

  const avatarControllerState: AvatarControllerState = {
    avatarState,
    emotion: companionEmotion,
    emotionIntensity,
    previewEmotion,
    audioLevel,
    micPermission,
    voiceError,
    glbInspection,
  };

  const avatarControllerActions: AvatarControllerActions = {
    onTapAvatar: handleTapAvatar,
    onInterrupt: handleInterrupt,
    onSelectPreviewEmotion: setPreviewEmotion,
    onInspectionComplete: setGlbInspection,
  };

  return (
    <GameShell
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      memoriesCount={memories.length}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 right-4 sm:right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-950/92 border border-indigo-300/30 text-white text-xs font-medium shadow-2xl backdrop-blur-md animate-fadeIn max-w-[90vw]"
        >
          <Check className="w-4 h-4 text-emerald-300 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Session History Sidebar Drawer (accessible from Home Header) */}
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
          const selected = conversations.find((c) => c.id === id);
          const lastModel = selected?.messages
            ? [...selected.messages].reverse().find((m) => m.role === 'model')
            : undefined;
          setAiSpokenText(lastModel ? lastModel.content : '');
          setUserTranscript('');
        }}
        onNewChat={() => {
          const newConv = storage.createConversation(settings.personality, settings.language);
          setConversations(storage.getConversations());
          setActiveConvId(newConv.id);
          handleEndCall();
          setAiSpokenText('');
          showToast('New session started');
        }}
        onDeleteChat={(id) => {
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
        }}
        onRenameChat={(id, title) => {
          storage.updateConversation(id, { title });
          setConversations(storage.getConversations());
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
          isMicMuted={isMicMuted}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          isChatDrawerOpen={isChatDrawerOpen}
          unreadCount={messages.length}
          onDismissBubble={() => setSpeechBubbleText(null)}
          onDismissHint={dismissHint}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onToggleSound={handleToggleSound}
          onChangeLanguage={(lang) => handleSaveSettings({ ...settings, language: lang })}
          onOpenSettings={() => handleSelectTab('settings')}
          onNavigatePlay={() => handleSelectTab('play')}
          onNavigateWardrobe={() => handleSelectTab('wardrobe')}
          onSendMessage={handleSendMessage}
          onToggleListen={handleToggleListen}
          onToggleMute={handleToggleMute}
          onInterrupt={handleInterrupt}
          onEndCall={handleEndCall}
          onRetryMic={handleRetryMic}
          onToggleChatDrawer={() => setIsChatDrawerOpen((prev) => !prev)}
          onQuickReaction={(emotion, label, line) =>
            triggerCompanionReaction(emotion, label, line, false)
          }
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
          progress={progress}
          glbInspection={glbInspection}
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

      {/* Slide-Over Full Scrollable Chat & Code Notes Drawer (Home) */}
      <ChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={messages}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
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
      />
    </GameShell>
  );
}
