import React, { useState, useEffect, useRef } from 'react';
import { 
  CompanionSettings, 
  ConversationSession, 
  ChatMessage, 
  UserMemory, 
  AvatarState, 
  SystemStatus,
  CompanionLanguage,
  CompanionPersonality
} from './types/companion';
import { storage, DEFAULT_SETTINGS } from './services/storage';
import { api } from './services/api';
import { speechService } from './services/speech';

// Components
import { Navbar } from './components/Navbar';
import { ConversationSidebar } from './components/Sidebar/ConversationSidebar';
import { CompanionAvatar, CompanionEmotion } from './components/Avatar/CompanionAvatar';
import { AvatarCustomizer } from './components/Avatar/AvatarCustomizer';
import { ConversationSubtitle } from './components/Voice/ConversationSubtitle';
import { VoiceControls } from './components/Voice/VoiceControls';
import { ChatDrawer } from './components/Chat/ChatDrawer';
import { MemoryModal } from './components/Memory/MemoryModal';
import { SettingsModal } from './components/Settings/SettingsModal';

import { 
  Key, 
  Sparkles, 
  Check, 
  AlertCircle,
  PhoneCall,
  Volume2
} from 'lucide-react';

export default function App() {
  // Persistence state
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

  // UI Modals state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAvatarCustomizerOpen, setIsAvatarCustomizerOpen] = useState(false);

  // Video-Call Companion State
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [companionEmotion, setCompanionEmotion] = useState<CompanionEmotion>('neutral');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiSpokenText, setAiSpokenText] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [suggestedMemory, setSuggestedMemory] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Turn timer for automatic voice silence detection
  const speechTimeoutRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);

  // 1. Initial Load: Check status, load or create conversation session
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
  }, []);

  // 2. Audio Level Sync for avatar mouth animation
  useEffect(() => {
    speechService.setAudioLevelCallback((level) => {
      setAudioLevel(level);
      if (level > 0.05) {
        setIsSpeaking(true);
        if (avatarState !== 'speaking') {
          setAvatarState('speaking');
        }
      } else if (!speechService.getIsSpeaking()) {
        setIsSpeaking(false);
        if (avatarState === 'speaking') {
          setAvatarState('idle');
        }
      }
    });

    return () => {
      speechService.setAudioLevelCallback(null);
    };
  }, [avatarState]);

  // Current session messages
  const currentConversation = conversations.find((c) => c.id === activeConvId);
  const messages = currentConversation?.messages || [];

  // Toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Determine emotional expression based on message content (Talking Tom inspiration)
  const analyzeEmotion = (text: string): CompanionEmotion => {
    const lower = text.toLowerCase();
    if (
      lower.includes('thank') ||
      lower.includes('shukriya') ||
      lower.includes('dhanyawad') ||
      lower.includes('happy') ||
      lower.includes('khush') ||
      lower.includes('great') ||
      lower.includes('awesome') ||
      lower.includes('haha') ||
      lower.includes('mast') ||
      lower.includes('love')
    ) {
      return 'happy';
    }
    if (
      lower.includes('sad') ||
      lower.includes('dukh') ||
      lower.includes('depress') ||
      lower.includes('anxious') ||
      lower.includes('stress') ||
      lower.includes('upset') ||
      lower.includes('pareshan') ||
      lower.includes('cry') ||
      lower.includes('tough day') ||
      lower.includes('lonely')
    ) {
      return 'empathetic';
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
    return 'neutral';
  };

  // Start voice listening
  const startListeningTurn = () => {
    if (isMicMuted || isProcessingRef.current) return;

    speechService.stopSpeaking();
    setAvatarState('listening');
    setUserTranscript('');

    let langLocale: any = 'en-IN';
    if (settings.language === 'hi') {
      langLocale = 'hi-IN';
    } else if (settings.language === 'en') {
      langLocale = 'en-IN';
    } else {
      langLocale = 'en-IN';
    }

    const started = speechService.startRecognition(langLocale, {
      onStart: () => {
        setAvatarState('listening');
      },
      onResult: (transcript, isFinal) => {
        setUserTranscript(transcript);

        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }

        // 1.3 seconds of silence signifies user finished speaking
        speechTimeoutRef.current = setTimeout(() => {
          if (transcript.trim() && !isProcessingRef.current) {
            handleSendMessage(transcript.trim());
          }
        }, 1300);
      },
      onError: (err) => {
        console.warn('Mic recognition error:', err);
        setAvatarState('error');
        showToast('Microphone error: ' + err);
      },
      onEnd: () => {
        if (!isProcessingRef.current && !speechService.getIsSpeaking() && avatarState === 'listening') {
          setAvatarState('idle');
        }
      },
    });

    if (!started) {
      showToast('Voice input unavailable in this browser. You can type in chat drawer.');
      setAvatarState('error');
    }
  };

  const stopListeningTurn = () => {
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
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

  const handleToggleMute = () => {
    if (isMicMuted) {
      setIsMicMuted(false);
      showToast('Microphone unmuted');
    } else {
      setIsMicMuted(true);
      stopListeningTurn();
      showToast('Microphone muted');
    }
  };

  // Immediate Interrupt function
  const handleInterrupt = () => {
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechService.stopSpeaking();
    setIsSpeaking(false);
    isProcessingRef.current = false;
    setAvatarState('interrupted');
    setCompanionEmotion('neutral');
    showToast('Interrupted (रोक दिया गया)');

    setTimeout(() => {
      setAvatarState('idle');
      if (!isMicMuted) {
        startListeningTurn();
      }
    }, 450);
  };

  // End Call / Reset Conversation
  const handleEndCall = () => {
    speechService.stopSpeaking();
    speechService.stopRecognition();
    setIsSpeaking(false);
    setAvatarState('idle');
    setCompanionEmotion('neutral');
    setUserTranscript('');
    setAiSpokenText('');
    showToast('Call ended. Ātmiya is resting.');
  };

  // Playful tap reaction on Avatar
  const handleTapAvatar = () => {
    const greetings = [
      'हाँजी! मैं सुन रही हूँ।',
      'Haanji! I am here with you.',
      'Aap bataiye, kaisa chal raha hai?',
      'Always listening, my friend!',
    ];
    const picked = greetings[Math.floor(Math.random() * greetings.length)];
    setAiSpokenText(picked);
    setCompanionEmotion('happy');

    if (settings.voiceEngine !== 'none') {
      speechService.speakWithBrowserTTS(
        picked,
        settings.language === 'hi' ? 'hi-IN' : 'en-IN',
        settings.speechRate
      );
    }
  };

  // Send message and get AI response
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessingRef.current || !activeConvId) return;

    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechService.stopRecognition();
    speechService.stopSpeaking();

    isProcessingRef.current = true;
    setIsThinking(true);
    setAvatarState('thinking');
    setUserTranscript(text);

    // Analyze emotional tone from user's words
    const detectedEmotion = analyzeEmotion(text);
    setCompanionEmotion(detectedEmotion);

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const currentMsgs = [...messages, userMessage];
    storage.updateConversation(activeConvId, {
      messages: currentMsgs,
      title: messages.length === 0 ? text.slice(0, 36) : (currentConversation?.title || 'Video Call'),
    });
    setConversations(storage.getConversations());

    try {
      const response = await api.sendMessage({
        message: text,
        history: currentMsgs,
        memories: settings.memoryEnabled ? memories : [],
        personality: settings.personality,
        language: settings.language,
        userName: settings.userName,
      });

      const replyText = response.reply;
      setAiSpokenText(replyText);

      // Analyze emotional tone of reply as well
      const replyEmotion = analyzeEmotion(replyText);
      setCompanionEmotion(replyEmotion !== 'neutral' ? replyEmotion : detectedEmotion);

      const aiMessage: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'model',
        content: replyText,
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

      // Play Audio Response
      if (settings.voiceEngine !== 'none') {
        setAvatarState('speaking');
        setIsSpeaking(true);

        const onFinish = () => {
          setAvatarState('idle');
          setIsSpeaking(false);
          setCompanionEmotion('neutral');

          // Hands-free continuous loop if enabled
          if (settings.handsFreeMode && !isMicMuted) {
            setTimeout(() => {
              if (!isProcessingRef.current && !speechService.getIsSpeaking()) {
                startListeningTurn();
              }
            }, 600);
          }
        };

        if (settings.voiceEngine === 'gemini-native') {
          try {
            const ttsRes = await api.generateTTS({
              text: replyText,
              voice: settings.selectedVoice || 'Kore',
            });
            if (ttsRes.audioBase64) {
              await speechService.playWavAudio(ttsRes.audioBase64, onFinish, () => {
                speechService.speakWithBrowserTTS(replyText, settings.language, settings.speechRate, onFinish);
              });
              return;
            }
          } catch (e) {
            console.warn('TTS playback error, trying browser fallback:', e);
          }
        }

        speechService.speakWithBrowserTTS(
          replyText,
          settings.language === 'hi' ? 'hi-IN' : 'en-IN',
          settings.speechRate,
          onFinish
        );
      } else {
        setAvatarState('idle');
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setIsThinking(false);
      isProcessingRef.current = false;
      setAvatarState('error');
      setCompanionEmotion('neutral');
      showToast('Error: ' + (err.message || 'Connection failed'));
    }
  };

  // Handlers for memory
  const handleAddMemory = (mem: Omit<UserMemory, 'id' | 'createdAt' | 'updatedAt'>) => {
    storage.addMemory(mem);
    setMemories(storage.getMemories());
    showToast('Memory approved and saved');
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

  const handleToggleMemoryEnabled = (enabled: boolean) => {
    const updated = { ...settings, memoryEnabled: enabled };
    setSettings(updated);
    storage.saveSettings(updated);
    showToast(enabled ? 'Memory enabled' : 'Memory disabled');
  };

  // Handlers for Settings
  const handleSaveSettings = (newSettings: CompanionSettings) => {
    setSettings(newSettings);
    storage.saveSettings(newSettings);
    showToast('Settings saved');
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-2xl animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Drawer */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={(id) => {
          setActiveConvId(id);
          storage.setActiveConversationId(id);
          speechService.stopSpeaking();
          setAvatarState('idle');
          setSuggestedMemory(null);
        }}
        onNewChat={() => {
          const newConv = storage.createConversation(settings.personality, settings.language);
          setConversations(storage.getConversations());
          setActiveConvId(newConv.id);
          handleEndCall();
          showToast('New session started');
        }}
        onDeleteChat={(id) => {
          storage.deleteConversation(id);
          setConversations(storage.getConversations());
          setActiveConvId(storage.getActiveConversationId());
        }}
        onRenameChat={(id, title) => {
          storage.updateConversation(id, { title });
          setConversations(storage.getConversations());
        }}
        onClearAll={() => {
          storage.clearAllConversations();
          const newConv = storage.createConversation(settings.personality, settings.language);
          setConversations([newConv]);
          setActiveConvId(newConv.id);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Video Call Screen Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative">
        {/* Top Video Call Bar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenVoiceMode={() => {
            // Already in voice video call mode! Toggle listen
            handleToggleListen();
          }}
          onOpenMemoryModal={() => setIsMemoryModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenAvatarCustomizer={() => setIsAvatarCustomizerOpen(true)}
          settings={settings}
          onUpdateSettings={handleSaveSettings}
          memoriesCount={memories.length}
          isKeyConfigured={systemStatus.isKeyConfigured}
        />

        {/* Warning if API key is not configured */}
        {!systemStatus.isKeyConfigured && (
          <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Gemini API Key:</strong> To connect Ātmiya's real-time voice & brain, ensure <code className="bg-black/30 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> is set in <strong>Settings &gt; Secrets</strong>.
              </span>
            </div>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="text-amber-300 hover:text-white underline font-semibold ml-2 shrink-0 cursor-pointer"
            >
              Learn More
            </button>
          </div>
        )}

        {/* Center Character-First Video Stage */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 overflow-hidden">
          {/* Large Realistic Human Avatar with Talking Tom Interactive Responsiveness */}
          <div className="w-full flex items-center justify-center my-auto transition-transform duration-500">
            <CompanionAvatar
              state={avatarState}
              emotion={companionEmotion}
              audioLevel={audioLevel}
              config={settings.avatarConfig}
              onInterrupt={handleInterrupt}
              onTapAvatar={handleTapAvatar}
            />
          </div>

          {/* Subtitle / Live Transcript Pill below avatar */}
          <ConversationSubtitle
            state={avatarState}
            userTranscript={userTranscript}
            aiSpokenText={aiSpokenText}
            className="mb-2"
          />
        </div>

        {/* Floating Bottom Video-Call Dock */}
        <VoiceControls
          state={avatarState}
          isMicMuted={isMicMuted}
          onToggleMute={handleToggleMute}
          onToggleListen={handleToggleListen}
          onInterrupt={handleInterrupt}
          onEndCall={handleEndCall}
          onToggleChatDrawer={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
          isChatDrawerOpen={isChatDrawerOpen}
          unreadCount={messages.length}
          language={settings.language}
          onChangeLanguage={(lang) => {
            const updated = { ...settings, language: lang };
            setSettings(updated);
            storage.saveSettings(updated);
          }}
        />

        {/* Slide-Over Text & Code History Drawer */}
        <ChatDrawer
          isOpen={isChatDrawerOpen}
          onClose={() => setIsChatDrawerOpen(false)}
          messages={messages}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          onInterrupt={handleInterrupt}
          settings={settings}
          onSendMessage={handleSendMessage}
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
      </div>

      {/* Memory Manager Modal */}
      <MemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        memories={memories}
        memoryEnabled={settings.memoryEnabled}
        onToggleMemoryEnabled={handleToggleMemoryEnabled}
        onAddMemory={handleAddMemory}
        onUpdateMemory={handleUpdateMemory}
        onDeleteMemory={handleDeleteMemory}
        onClearAllMemories={handleClearAllMemories}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        isApiKeyConfigured={systemStatus.isKeyConfigured}
      />

      {/* Avatar Customizer Modal */}
      <AvatarCustomizer
        isOpen={isAvatarCustomizerOpen}
        onClose={() => setIsAvatarCustomizerOpen(false)}
        config={settings.avatarConfig}
        onChange={(newConfig) => {
          const updated = { ...settings, avatarConfig: newConfig };
          setSettings(updated);
          storage.saveSettings(updated);
        }}
      />
    </div>
  );
}
