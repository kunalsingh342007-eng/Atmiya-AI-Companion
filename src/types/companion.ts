export type CompanionLanguage = 'auto' | 'hi' | 'hinglish' | 'en';

export type CompanionPersonality = 
  | 'calm' 
  | 'friendly' 
  | 'reflective' 
  | 'study' 
  | 'creative';

export type AvatarState = 
  | 'idle' 
  | 'listening' 
  | 'thinking' 
  | 'speaking' 
  | 'interrupted' 
  | 'connecting' 
  | 'error';

export type MemoryCategory = 
  | 'language' 
  | 'preference' 
  | 'project' 
  | 'learning_goal' 
  | 'fact' 
  | 'custom';

export interface UserMemory {
  id: string;
  category: MemoryCategory;
  content: string;
  sourceText?: string;
  createdAt: number;
  updatedAt: number;
  approvedByUser: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  detectedLanguage?: string;
  audioUrl?: string;
  isVoiceInput?: boolean;
}

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  personality: CompanionPersonality;
  language: CompanionLanguage;
}

export interface AvatarAppearanceConfig {
  genderVibe: 'female' | 'male' | 'androgynous';
  personaName: string;
  accentColor: string; // e.g. violet, cyan, amber, emerald
  clothingStyle: 'modern-casual' | 'traditional-kurta' | 'tech-hoodie';
}

export interface CompanionSettings {
  userName: string;
  language: CompanionLanguage;
  personality: CompanionPersonality;
  voiceEngine: 'gemini-native' | 'browser-tts' | 'none';
  selectedVoice: string; // e.g. Kore, Puck, Fenrir, Zephyr, Charon or browser voice
  speechRate: number; // 0.8 to 1.3
  autoSpeakResponse: boolean;
  handsFreeMode: boolean; // Auto-listen after speech finishes
  memoryEnabled: boolean;
  avatarConfig: AvatarAppearanceConfig;
  theme: 'dark' | 'midnight' | 'warm-charcoal';
}

export interface SystemStatus {
  isKeyConfigured: boolean;
  model: string;
  ttsModel: string;
  transcribeModel: string;
  supportedVoices: string[];
}
