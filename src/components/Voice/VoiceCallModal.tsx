import React, { useState, useEffect, useRef } from 'react';
import { 
  CompanionSettings, 
  AvatarState, 
  ChatMessage, 
  UserMemory 
} from '../../types/companion';
import { AvatarDisplay } from '../Avatar/AvatarDisplay';
import { speechService } from '../../services/speech';
import { api } from '../../services/api';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  PauseCircle, 
  Globe, 
  AlertCircle,
  Headphones,
  RotateCcw
} from 'lucide-react';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanionSettings;
  memories: UserMemory[];
  history: ChatMessage[];
  onNewMessage: (userMsg: string, aiReply: string) => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  settings,
  memories,
  history,
  onNewMessage,
}) => {
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [aiSpokenText, setAiSpokenText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to talk. Say something...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Turn timer to avoid premature sends during natural mid-sentence pauses
  const speechTimeoutRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);
  const currentLangRef = useRef<string>(settings.language);

  useEffect(() => {
    currentLangRef.current = settings.language;
  }, [settings.language]);

  // Audio level hook for avatar mouth sync
  useEffect(() => {
    if (!isOpen) return;

    speechService.setAudioLevelCallback((level) => {
      setAudioLevel(level);
    });

    return () => {
      speechService.setAudioLevelCallback(null);
    };
  }, [isOpen]);

  // Handle Voice Call lifecycle
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setAvatarState('idle');
      setStatusMessage('Ātmiya is listening. Start speaking...');
      startListeningTurn();
    } else {
      endVoiceSession();
    }

    return () => {
      endVoiceSession();
    };
  }, [isOpen]);

  const endVoiceSession = () => {
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechService.stopSpeaking();
    speechService.stopRecognition();
    setAvatarState('idle');
    setAudioLevel(0);
    isProcessingRef.current = false;
  };

  const startListeningTurn = () => {
    if (isMicMuted || isProcessingRef.current) return;

    setAvatarState('listening');
    setStatusMessage('Listening to your voice (सुन रही हूँ)...');

    // Language locale mapping
    let langLocale: 'hi-IN' | 'en-IN' | 'en-US' | 'auto' = 'en-IN';
    if (settings.language === 'hi') {
      langLocale = 'hi-IN';
    } else if (settings.language === 'en') {
      langLocale = 'en-IN';
    } else {
      // For auto & hinglish, en-IN / hi-IN both handle Indian cadence well
      langLocale = 'en-IN';
    }

    const started = speechService.startRecognition(langLocale, {
      onStart: () => {
        setAvatarState('listening');
        setStatusMessage('Listening... (बोलिए, मैं सुन रही हूँ)');
      },
      onResult: (transcript, isFinal) => {
        setUserTranscript(transcript);
        setStatusMessage('Hearing: ' + transcript);

        // Clear existing debounce timeout
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }

        // Wait 1.4 seconds of silence to consider turn finished
        speechTimeoutRef.current = setTimeout(() => {
          if (transcript.trim() && !isProcessingRef.current) {
            handleUserUtterance(transcript.trim());
          }
        }, 1400);
      },
      onError: (err) => {
        setErrorMessage(err);
        setAvatarState('error');
        setStatusMessage('Microphone issue: ' + err);
      },
      onEnd: () => {
        // If not processing and not speaking, restart listening if still open
        if (!isProcessingRef.current && !speechService.getIsSpeaking() && isOpen && !isMicMuted) {
          // Restart after short breathe interval
          setTimeout(() => {
            if (isOpen && !isProcessingRef.current && !speechService.getIsSpeaking() && !isMicMuted) {
              startListeningTurn();
            }
          }, 300);
        }
      },
    });

    if (!started) {
      setErrorMessage(
        'Speech recognition unavailable in this browser. You can still type in chat mode or click the retry button.'
      );
      setAvatarState('error');
    }
  };

  const handleUserUtterance = async (transcript: string) => {
    if (isProcessingRef.current || !transcript) return;
    isProcessingRef.current = true;
    speechService.stopRecognition();

    setAvatarState('thinking');
    setStatusMessage('Ātmiya is thinking... (आत्मीय सोच रही है)');

    try {
      // 1. Call Gemini Chat
      const response = await api.sendMessage({
        message: transcript,
        history,
        memories: settings.memoryEnabled ? memories : [],
        personality: settings.personality,
        language: settings.language,
        userName: settings.userName,
      });

      const reply = response.reply;
      setAiSpokenText(reply);
      onNewMessage(transcript, reply);

      // 2. Play Audio Response
      await speakReply(reply);
    } catch (err: any) {
      console.error('Voice processing error:', err);
      setErrorMessage(err.message || 'Error communicating with companion.');
      setAvatarState('error');
      setStatusMessage('Sorry, I encountered an issue. Let’s try again.');
      isProcessingRef.current = false;
    }
  };

  const speakReply = async (replyText: string) => {
    setAvatarState('speaking');
    setStatusMessage('Ātmiya is speaking (आत्मीय बोल रही है)...');

    const onSpeechEnd = () => {
      setAvatarState('idle');
      isProcessingRef.current = false;
      setStatusMessage('Waiting for you to speak...');

      // Hands-free continuous loop: resume listening automatically!
      if (isOpen && !isMicMuted) {
        setUserTranscript('');
        setTimeout(() => {
          if (isOpen && !isProcessingRef.current && !isMicMuted) {
            startListeningTurn();
          }
        }, 500);
      }
    };

    // Try Gemini Native TTS if selected
    if (settings.voiceEngine === 'gemini-native') {
      try {
        const ttsRes = await api.generateTTS({
          text: replyText,
          voice: settings.selectedVoice || 'Kore',
          style: 'Warm, natural, emotionally present companion',
        });

        if (ttsRes.audioBase64) {
          await speechService.playWavAudio(
            ttsRes.audioBase64,
            onSpeechEnd,
            (err) => {
              console.warn('WAV playback failed, falling back to browser TTS:', err);
              speechService.speakWithBrowserTTS(replyText, settings.language, settings.speechRate, onSpeechEnd);
            }
          );
          return;
        }
      } catch (err) {
        console.warn('Gemini TTS error, falling back to Browser TTS:', err);
      }
    }

    // Fallback: Browser Speech Synthesis
    speechService.speakWithBrowserTTS(
      replyText,
      settings.language === 'hi' ? 'hi-IN' : 'en-IN',
      settings.speechRate,
      onSpeechEnd
    );
  };

  // Immediate Interrupt action
  const handleInterrupt = () => {
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechService.stopSpeaking();
    isProcessingRef.current = false;
    setAvatarState('interrupted');
    setStatusMessage('Interrupted. Listening to you...');

    setTimeout(() => {
      if (isOpen && !isMicMuted) {
        setUserTranscript('');
        startListeningTurn();
      }
    }, 400);
  };

  const toggleMic = () => {
    if (isMicMuted) {
      setIsMicMuted(false);
      startListeningTurn();
    } else {
      setIsMicMuted(true);
      speechService.stopRecognition();
      setAvatarState('idle');
      setStatusMessage('Microphone muted.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 animate-fadeIn">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-violet-600/15 filter blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full bg-cyan-600/10 filter blur-3xl" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 p-5 flex items-center justify-between border-b border-slate-900 bg-slate-950/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center font-serif font-bold text-white shadow-md">
            आ
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide flex items-center gap-2">
              Ātmiya Live Voice Companion
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-[11px] text-slate-400">
              Two-way hands-free natural conversation • हिन्दी, Hinglish, English
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Main Avatar Stage */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto w-full">
        {/* Animated Avatar Display */}
        <div className="transform scale-110 sm:scale-125 my-4">
          <AvatarDisplay
            state={avatarState}
            audioLevel={audioLevel}
            config={settings.avatarConfig}
            onInterrupt={handleInterrupt}
          />
        </div>

        {/* Status Message */}
        <div className="mt-8 text-xs font-medium text-slate-300 min-h-[20px] tracking-wide flex items-center justify-center gap-2">
          {avatarState === 'listening' && (
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-200" />
            </span>
          )}
          <span>{statusMessage}</span>
        </div>

        {/* Live Subtitle Transcript Banner */}
        <div className="mt-4 w-full max-w-md p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg min-h-[64px] flex flex-col justify-center text-xs">
          {avatarState === 'speaking' ? (
            <div className="text-violet-200 leading-relaxed font-normal animate-fadeIn">
              <span className="font-semibold text-violet-400 mr-1.5">Ātmiya:</span>
              {aiSpokenText.slice(0, 260) + (aiSpokenText.length > 260 ? '...' : '')}
            </div>
          ) : userTranscript ? (
            <div className="text-cyan-200 leading-relaxed font-normal animate-fadeIn">
              <span className="font-semibold text-cyan-400 mr-1.5">You:</span>
              {userTranscript}
            </div>
          ) : (
            <span className="text-slate-500 italic">
              Speak naturally in Hindi, Hinglish, or English...
            </span>
          )}
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-xs text-rose-300 flex items-center gap-2 max-w-md">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-left flex-1">{errorMessage}</span>
            <button
              onClick={() => {
                setErrorMessage(null);
                startListeningTurn();
              }}
              className="px-2 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-white text-[10px] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Bottom Voice Call Bar */}
      <div className="relative z-10 p-6 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md flex items-center justify-center gap-5">
        {/* Mute / Unmute Mic */}
        <button
          onClick={toggleMic}
          className={`p-4 rounded-full border transition-all cursor-pointer ${
            isMicMuted
              ? 'bg-rose-950/80 border-rose-700 text-rose-300'
              : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
          }`}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Interrupt / Stop Speaking Button */}
        {avatarState === 'speaking' ? (
          <button
            onClick={handleInterrupt}
            className="px-6 py-4 rounded-full bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-semibold text-xs shadow-xl shadow-amber-950/60 flex items-center gap-2 border border-white/20 transition transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <PauseCircle className="w-5 h-5" />
            <span>Interrupt (रोकें)</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (avatarState === 'listening') {
                if (userTranscript) handleUserUtterance(userTranscript);
              } else {
                startListeningTurn();
              }
            }}
            className="px-6 py-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-xl shadow-violet-950/60 flex items-center gap-2 border border-white/20 transition transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>{avatarState === 'listening' ? 'Finish Speaking' : 'Start Speaking'}</span>
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={onClose}
          className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/60 transition transform hover:scale-105 active:scale-95 cursor-pointer"
          title="End Voice Call (कॉल समाप्त करें)"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
