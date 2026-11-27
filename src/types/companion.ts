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
  | 'preparing_audio'
  | 'speaking'
  | 'interrupted'
  | 'connecting'
  | 'error';

export const AVATAR_EMOTIONS = [
  'neutral',
  'happy',
  'smile',
  'laughing',
  'encouraging',
  'sad',
  'thinking',
  'confused',
  'surprised',
  'curious',
  'worried',
  'concerned',
  'empathetic',
  'excited',
  'calm',
  'disappointed',
  'winking',
  'talking',
] as const;

export type AvatarEmotion = (typeof AVATAR_EMOTIONS)[number];

export const AVATAR_GESTURE_HINTS = [
  'none',
  'gentle_nod',
  'nod',
  'wave',
  'open_palm',
  'head_tilt',
] as const;

export type AvatarGestureHint = (typeof AVATAR_GESTURE_HINTS)[number];

export interface StructuredEmotionResponse {
  text: string;
  emotion: AvatarEmotion;
  intensity: number;
  gesture: AvatarGestureHint;
}

export const CORE_COMPANION_EMOTIONS = [
  'neutral',
  'happy',
  'thinking',
  'concerned',
] as const;

export type CoreCompanionEmotion = (typeof CORE_COMPANION_EMOTIONS)[number];

export const UNIFIED_ANIMATION_STATES = [
  'idle',
  'greeting',
  'listening',
  'thinking',
  'preparing_audio',
  'speaking',
  'gesturing',
  'interrupted',
  'error',
  'happy',
  'concerned',
  'goodbye',
] as const;

export type UnifiedAnimationState = (typeof UNIFIED_ANIMATION_STATES)[number];

export interface AvatarAnimationRequest {
  animationState?: UnifiedAnimationState;
  emotion?: AvatarEmotion;
  gesture?: 'none' | 'wave' | 'nod';
  gestureHint?: AvatarGestureHint;
  speechText?: string;
  intensity?: number;
  durationMs?: number;
}

export const AVATAR_EMOTION_LABELS: Record<AvatarEmotion, string> = {
  neutral: 'Neutral / Listening',
  happy: 'Happy',
  smile: 'Natural Smile',
  laughing: 'Laughing',
  encouraging: 'Encouraging',
  sad: 'Sad',
  thinking: 'Thinking',
  confused: 'Confused',
  surprised: 'Surprised',
  curious: 'Curious',
  worried: 'Worried',
  concerned: 'Concerned',
  empathetic: 'Empathetic',
  excited: 'Excited',
  calm: 'Calm',
  disappointed: 'Disappointed',
  winking: 'Winking',
  talking: 'Talking',
};

export interface EmotionMetadata {
  emotion: AvatarEmotion;
  intensity: number;
  gesture?: AvatarGestureHint;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  detectedLanguage?: string;
  emotion?: AvatarEmotion;
  emotionIntensity?: number;
  gestureHint?: AvatarGestureHint;
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

export type ActiveNavTab =
  | 'home'
  | 'history'
  | 'play'
  | 'settings';

export interface UserProfile {
  displayName: string;
  avatarDataUrl?: string;
  bio?: string;
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export type RoomEnvironmentId =
  | 'sunlit-study'
  | 'evening-lounge'
  | 'indigo-loft'
  | 'cream-solarium';

export type PortraitAccessoryId =
  | 'none'
  | 'lotus-pin'
  | 'star-clip'
  | 'glasses-frame';

export interface RoomConfig {
  environment: RoomEnvironmentId;
  lightingMood: 'natural' | 'warm' | 'soft-evening';
}

export type MicPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown';

export type GameId = 'memory-match' | 'quick-quiz' | 'pattern-match';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: number;
}

export interface InteractionHistoryEntry {
  id: string;
  label: string;
  xpEarned: number;
  timestamp: number;
}

export interface GameProgress {
  xp: number;
  gamesCompleted: number;
  bestScores: Partial<Record<GameId, number>>;
  achievements: Achievement[];
  unlockedRoomIds: RoomEnvironmentId[];
  interactionHistory: InteractionHistoryEntry[];
}

export type CameraFramingPreset = 'close-up' | 'upper-body' | 'full-body';

export interface AvatarAppearanceConfig {
  genderVibe: 'female' | 'male' | 'androgynous';
  personaName: string;
  accentColor: string;
  clothingStyle: 'modern-casual' | 'traditional-kurta' | 'tech-hoodie';
  outfitColor?: string;
  outfitStyleLabel?: string;
  accessory?: PortraitAccessoryId;
  defaultCameraPreset?: CameraFramingPreset;
  avatarType?: 'three-ws' | '3d-glb' | 'custom-image' | 'vector';
  customImagePath?: string;
  glbModelPath?: string;
  threeWsAvatarId?: string;
  threeWsModelUrl?: string;
  threeWsMigrated?: boolean;
  localGlbMigrated?: boolean;
  seatedDefaultMigrated?: boolean;
}

export interface CompanionSettings {
  userName: string;
  language: CompanionLanguage;
  personality: CompanionPersonality;
  voiceEngine: 'gemini-native' | 'browser-tts' | 'none';
  selectedVoice: string;
  speechRate: number;
  autoSpeakResponse: boolean;
  handsFreeMode: boolean;
  avatarConfig: AvatarAppearanceConfig;
  roomConfig?: RoomConfig;
  theme: 'auto' | 'dark' | 'light';
  expressionsEnabled?: boolean;
  darkNavyDefaultMigrated?: boolean;
}

export interface SystemStatus {
  isKeyConfigured: boolean;
  model: string;
  ttsModel: string;
  transcribeModel: string;
  supportedVoices: string[];
}
