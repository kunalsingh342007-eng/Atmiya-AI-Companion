import { 
  CompanionSettings, 
  ConversationSession, 
  UserMemory 
} from '../types/companion';

const SETTINGS_KEY = 'atmiya_companion_settings_v1';
const CONVERSATIONS_KEY = 'atmiya_conversations_v1';
const MEMORIES_KEY = 'atmiya_user_memories_v1';
const ACTIVE_CONV_ID_KEY = 'atmiya_active_conv_id_v1';

export const DEFAULT_SETTINGS: CompanionSettings = {
  userName: '',
  language: 'auto',
  personality: 'calm',
  voiceEngine: 'gemini-native',
  selectedVoice: 'Kore',
  speechRate: 1.0,
  autoSpeakResponse: true,
  handsFreeMode: false,
  memoryEnabled: true,
  theme: 'midnight',
  avatarConfig: {
    genderVibe: 'female',
    personaName: 'Ātmiya',
    accentColor: '#8b5cf6', // soft violet
    clothingStyle: 'modern-casual',
  },
};

export const INITIAL_MEMORIES: UserMemory[] = [
  {
    id: 'sample-mem-1',
    category: 'preference',
    content: 'Prefers conversational, warm explanations with intuitive examples.',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    approvedByUser: true,
  },
  {
    id: 'sample-mem-2',
    category: 'language',
    content: 'Enjoys switching seamlessly between Hindi, Hinglish, and English.',
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 43200000,
    approvedByUser: true,
  },
];

// Helper to safely access localStorage
export const storage = {
  getSettings(): CompanionSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: CompanionSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  getMemories(): UserMemory[] {
    try {
      const data = localStorage.getItem(MEMORIES_KEY);
      if (!data) {
        // Initialize with default sample memories
        this.saveMemories(INITIAL_MEMORIES);
        return INITIAL_MEMORIES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_MEMORIES;
    }
  },

  saveMemories(memories: UserMemory[]): void {
    try {
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
    } catch (e) {
      console.error('Failed to save memories:', e);
    }
  },

  addMemory(memory: Omit<UserMemory, 'id' | 'createdAt' | 'updatedAt'>): UserMemory {
    const list = this.getMemories();
    const newEntry: UserMemory = {
      ...memory,
      id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    list.unshift(newEntry);
    this.saveMemories(list);
    return newEntry;
  },

  updateMemory(id: string, updates: Partial<UserMemory>): void {
    const list = this.getMemories().map((m) =>
      m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
    );
    this.saveMemories(list);
  },

  deleteMemory(id: string): void {
    const list = this.getMemories().filter((m) => m.id !== id);
    this.saveMemories(list);
  },

  clearAllMemories(): void {
    this.saveMemories([]);
  },

  getConversations(): ConversationSession[] {
    try {
      const data = localStorage.getItem(CONVERSATIONS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveConversations(sessions: ConversationSession[]): void {
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save conversations:', e);
    }
  },

  getActiveConversationId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_CONV_ID_KEY);
    } catch {
      return null;
    }
  },

  setActiveConversationId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_CONV_ID_KEY, id);
    } catch (e) {
      console.error('Failed to set active conversation:', e);
    }
  },

  createConversation(personality = DEFAULT_SETTINGS.personality, language = DEFAULT_SETTINGS.language): ConversationSession {
    const newConv: ConversationSession = {
      id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      personality,
      language,
    };
    const list = this.getConversations();
    list.unshift(newConv);
    this.saveConversations(list);
    this.setActiveConversationId(newConv.id);
    return newConv;
  },

  updateConversation(id: string, updates: Partial<ConversationSession>): void {
    const list = this.getConversations().map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    this.saveConversations(list);
  },

  deleteConversation(id: string): void {
    const list = this.getConversations().filter((c) => c.id !== id);
    this.saveConversations(list);
    if (this.getActiveConversationId() === id) {
      if (list.length > 0) {
        this.setActiveConversationId(list[0].id);
      } else {
        localStorage.removeItem(ACTIVE_CONV_ID_KEY);
      }
    }
  },

  clearAllConversations(): void {
    this.saveConversations([]);
    localStorage.removeItem(ACTIVE_CONV_ID_KEY);
  },

  exportAllData(): string {
    const exportObject = {
      appName: 'Ātmiya Companion',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      memories: this.getMemories(),
      conversations: this.getConversations(),
    };
    return JSON.stringify(exportObject, null, 2);
  },

  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) this.saveSettings(data.settings);
      if (Array.isArray(data.memories)) this.saveMemories(data.memories);
      if (Array.isArray(data.conversations)) this.saveConversations(data.conversations);
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  },
};
