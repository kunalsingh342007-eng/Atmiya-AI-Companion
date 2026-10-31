// Speech and Audio synthesis, recognition, and lip-sync analyser service

export interface SpeechRecognitionHandlers {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

class SpeechService {
  private recognition: any = null;
  private isListening = false;
  private audioContext: AudioContext | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private onAudioLevelCallback: ((level: number) => void) | null = null;
  private isSpeaking = false;

  constructor() {
    // Lazy AudioContext initialization on user interaction
  }

  private initAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Check if browser speech recognition is supported
   */
  public isRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && 
      Boolean((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);
  }

  /**
   * Start speech recognition for voice input
   */
  public startRecognition(
    langCode: 'hi-IN' | 'en-IN' | 'en-US' | 'auto',
    handlers: SpeechRecognitionHandlers
  ): boolean {
    if (!this.isRecognitionSupported()) {
      handlers.onError('Speech recognition is not supported in this browser.');
      return false;
    }

    try {
      this.stopRecognition();

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      // Map language
      let chosenLang = 'en-IN';
      if (langCode === 'hi-IN' || langCode === 'hi' as any) {
        chosenLang = 'hi-IN';
      } else if (langCode === 'en-US') {
        chosenLang = 'en-US';
      } else {
        // Default to en-IN which handles both Indian English and common Hinglish
        chosenLang = 'en-IN';
      }
      this.recognition.lang = chosenLang;

      this.recognition.onstart = () => {
        this.isListening = true;
        handlers.onStart();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        if (text) {
          handlers.onResult(text, Boolean(finalTranscript));
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          handlers.onError('Microphone permission denied. Please allow microphone access.');
        } else if (event.error !== 'no-speech') {
          handlers.onError(`Speech error: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        handlers.onEnd();
      };

      this.recognition.start();
      return true;
    } catch (e: any) {
      handlers.onError(e.message || 'Could not start microphone');
      return false;
    }
  }

  public stopRecognition(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
    this.recognition = null;
  }

  /**
   * Set callback to receive real-time audio volume level (0.0 to 1.0)
   * used for avatar mouth animation and visualizer
   */
  public setAudioLevelCallback(cb: ((level: number) => void) | null) {
    this.onAudioLevelCallback = cb;
  }

  /**
   * Play base64 WAV audio (from Gemini TTS) with Web Audio Analyser
   */
  public async playWavAudio(
    base64Wav: string, 
    onEnd?: () => void,
    onError?: (err: any) => void
  ): Promise<void> {
    try {
      this.stopSpeaking();

      const ctx = this.initAudioContext();
      // Decode base64 to arraybuffer
      const binaryString = atob(base64Wav);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

      // Create AnalyserNode for lip-sync and frequency metering
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      this.analyser = analyser;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      this.currentSourceNode = source;
      this.isSpeaking = true;

      // Start lip sync animation loop
      this.startAnalyserLoop();

      source.onended = () => {
        this.cleanupPlayback();
        if (onEnd) onEnd();
      };

      source.start(0);
    } catch (err: any) {
      console.error('Audio playback error:', err);
      this.cleanupPlayback();
      if (onError) onError(err);
    }
  }

  /**
   * Browser SpeechSynthesis fallback for offline or zero-quota states
   */
  public speakWithBrowserTTS(
    text: string, 
    lang: string, 
    rate = 1.0, 
    onEnd?: () => void
  ): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }

    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.7, Math.min(1.4, rate));
    
    // Choose appropriate voice if available
    const voices = window.speechSynthesis.getVoices();
    let matchedVoice = null;

    if (lang === 'hi' || lang === 'hi-IN') {
      matchedVoice = voices.find((v) => v.lang.startsWith('hi'));
    }
    if (!matchedVoice) {
      matchedVoice = voices.find((v) => v.lang.startsWith('en-IN') || v.lang.startsWith('en-GB') || v.lang.startsWith('en'));
    }
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    this.isSpeaking = true;

    // Simulate mouth movement based on speech cadence
    let interval: any = null;
    interval = setInterval(() => {
      if (!this.isSpeaking) {
        clearInterval(interval);
        return;
      }
      // Pulsing level around 0.3 to 0.9 for browser speech synthesis
      const simulatedLevel = 0.2 + Math.random() * 0.7;
      if (this.onAudioLevelCallback) {
        this.onAudioLevelCallback(simulatedLevel);
      }
    }, 120);

    utterance.onend = () => {
      if (interval) clearInterval(interval);
      this.cleanupPlayback();
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      if (interval) clearInterval(interval);
      this.cleanupPlayback();
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Interrupt current speech immediately
   */
  public stopSpeaking(): void {
    this.isSpeaking = false;
    
    // Stop Web Audio node
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch {
        // ignore
      }
      this.currentSourceNode = null;
    }

    // Stop Audio Element if any
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudioElement = null;
    }

    // Stop Browser TTS
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    this.cleanupPlayback();
  }

  private cleanupPlayback(): void {
    this.isSpeaking = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.onAudioLevelCallback) {
      this.onAudioLevelCallback(0);
    }
  }

  private startAnalyserLoop(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!this.isSpeaking || !this.analyser) {
        if (this.onAudioLevelCallback) this.onAudioLevelCallback(0);
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);

      // Average the human voice frequencies (lower-mid frequencies, roughly bins 2-25)
      let sum = 0;
      const count = Math.min(30, dataArray.length);
      for (let i = 2; i < count; i++) {
        sum += dataArray[i];
      }
      const average = sum / (count - 2);
      // Normalized between 0.0 and 1.0
      const normalizedLevel = Math.min(1.0, Math.max(0, average / 140));

      if (this.onAudioLevelCallback) {
        this.onAudioLevelCallback(normalizedLevel);
      }

      this.animationFrameId = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const speechService = new SpeechService();
