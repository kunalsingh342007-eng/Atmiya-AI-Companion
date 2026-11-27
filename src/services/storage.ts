import {
  Achievement,
  CompanionSettings,
  ConversationSession,
  GameId,
  GameProgress,
  RoomEnvironmentId,
  UserProfile,
} from '../types/companion';

const SETTINGS_KEY = 'atmiya_companion_settings_v1';
const PROFILE_KEY = 'atmiya_user_profile_v1';
const CONVERSATIONS_KEY = 'atmiya_conversations_v1';
const ACTIVE_CONV_ID_KEY = 'atmiya_active_conv_id_v1';
const PROGRESS_KEY = 'atmiya_game_progress_v1';
const HOME_HINT_KEY = 'atmiya_home_hint_dismissed_v1';

export const DEFAULT_AVATAR_CONFIG: CompanionSettings['avatarConfig'] = {
  genderVibe: 'female',
  personaName: 'Ātmiya',
  accentColor: '#3b82f6', // navy-blue accent
  clothingStyle: 'modern-casual',
  outfitColor: '#1e3a5f',
  outfitStyleLabel: 'Navy Classic',
  accessory: 'none',
  defaultCameraPreset: 'close-up',
  avatarType: '3d-glb',
  customImagePath: '/avatars/atmiya.png',
  glbModelPath: '/models/atmiya-avatar.glb',
  threeWsAvatarId: '7f2a722a-ce89-4f13-adba-443f9d962c47',
  threeWsModelUrl:
    'https://three.ws/cdn/u/32cbe0d2-f178-4ef7-8d82-a29f6c6a18cb/wren-9c74a4/mwqqnhw6.glb',
  threeWsMigrated: true,
  localGlbMigrated: true,
  seatedDefaultMigrated: true,
};

export const DEFAULT_ROOM_CONFIG: NonNullable<CompanionSettings['roomConfig']> = {
  environment: 'sunlit-study',
  lightingMood: 'natural',
};

export const DEFAULT_SETTINGS: CompanionSettings = {
  userName: '',
  language: 'auto',
  personality: 'calm',
  voiceEngine: 'gemini-native',
  selectedVoice: 'Kore',
  speechRate: 1.0,
  autoSpeakResponse: true,
  handsFreeMode: false,
  theme: 'dark',
  expressionsEnabled: true,
  darkNavyDefaultMigrated: true,
  avatarConfig: DEFAULT_AVATAR_CONFIG,
  roomConfig: DEFAULT_ROOM_CONFIG,
};

export const DEFAULT_PROGRESS: GameProgress = {
  xp: 0,
  gamesCompleted: 0,
  bestScores: {},
  achievements: [],
  unlockedRoomIds: ['sunlit-study', 'evening-lounge'],
  interactionHistory: [],
};

function computeUnlockedRooms(xp: number, existing: RoomEnvironmentId[]): RoomEnvironmentId[] {
  const unlocked = new Set<RoomEnvironmentId>(['sunlit-study', 'evening-lounge', ...existing]);
  if (xp >= 25) unlocked.add('indigo-loft');
  if (xp >= 50) unlocked.add('cream-solarium');
  return Array.from(unlocked);
}

function addAchievementIfMissing(
  list: Achievement[],
  id: string,
  title: string,
  description: string
): Achievement[] {
  if (list.some((a) => a.id === id)) return list;
  return [
    ...list,
    {
      id,
      title,
      description,
      unlockedAt: Date.now(),
    },
  ];
}

export const storage = {
  getSettings(): CompanionSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return DEFAULT_SETTINGS;
      }
      const parsedAvatar =
        parsed.avatarConfig && typeof parsed.avatarConfig === 'object' && !Array.isArray(parsed.avatarConfig)
          ? parsed.avatarConfig
          : {};
      const parsedRoom =
        parsed.roomConfig && typeof parsed.roomConfig === 'object' && !Array.isArray(parsed.roomConfig)
          ? parsed.roomConfig
          : {};
      const mergedAvatar: CompanionSettings['avatarConfig'] = {
        ...DEFAULT_AVATAR_CONFIG,
        ...parsedAvatar,
      };
      if (!parsedAvatar.localGlbMigrated) {
        mergedAvatar.avatarType = '3d-glb';
        mergedAvatar.glbModelPath = mergedAvatar.glbModelPath || '/models/atmiya-avatar.glb';
        mergedAvatar.localGlbMigrated = true;
      }
      if (!parsedAvatar.seatedDefaultMigrated) {
        mergedAvatar.defaultCameraPreset = 'close-up';
        mergedAvatar.seatedDefaultMigrated = true;
      }
      const needsDarkNavyMigration = !parsed.darkNavyDefaultMigrated;
      if (needsDarkNavyMigration) {
        mergedAvatar.defaultCameraPreset = 'close-up';
      }
      const resolved: CompanionSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        theme: needsDarkNavyMigration
          ? 'dark'
          : parsed.theme === 'light' || parsed.theme === 'auto' || parsed.theme === 'dark'
          ? parsed.theme
          : 'dark',
        expressionsEnabled:
          typeof parsed.expressionsEnabled === 'boolean' ? parsed.expressionsEnabled : true,
        darkNavyDefaultMigrated: true,
        avatarConfig: mergedAvatar,
        roomConfig: {
          ...DEFAULT_ROOM_CONFIG,
          ...parsedRoom,
        },
      };
      if (needsDarkNavyMigration) {
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(resolved));
        } catch {
          // ignore storage quota errors
        }
      }
      return resolved;
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

  getProfile(): UserProfile {
    const now = Date.now();
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return {
            displayName: typeof parsed.displayName === 'string' ? parsed.displayName : '',
            avatarDataUrl:
              typeof parsed.avatarDataUrl === 'string' && parsed.avatarDataUrl.trim()
                ? parsed.avatarDataUrl.trim()
                : undefined,
            bio: typeof parsed.bio === 'string' ? parsed.bio : '',
            onboardingCompleted: Boolean(parsed.onboardingCompleted),
            createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : now,
            updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : now,
          };
        }
      }

      // Migrate returning pre-v1 users who already configured a name or saved conversations
      const existingSettings = this.getSettings();
      const existingConvs = this.getConversations();
      const hasPriorUsage =
        Boolean(existingSettings.userName?.trim()) ||
        existingConvs.some((c) => Array.isArray(c.messages) && c.messages.length > 0);

      if (hasPriorUsage) {
        const migrated: UserProfile = {
          displayName: existingSettings.userName?.trim() || '',
          bio: '',
          onboardingCompleted: true,
          createdAt: now,
          updatedAt: now,
        };
        this.saveProfile(migrated);
        return migrated;
      }
    } catch {
      // fall through to clean default
    }

    return {
      displayName: '',
      bio: '',
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  saveProfile(profile: UserProfile): { ok: boolean; error?: string } {
    try {
      const sanitized: UserProfile = {
        ...profile,
        displayName: profile.displayName.trim().slice(0, 80),
        bio: profile.bio ? profile.bio.trim().slice(0, 240) : '',
        updatedAt: Date.now(),
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitized));
      return { ok: true };
    } catch (e: any) {
      console.error('Failed to save user profile:', e);
      return {
        ok: false,
        error:
          e?.name === 'QuotaExceededError'
            ? 'Browser storage is full. Try removing or using a smaller profile image.'
            : 'Could not save profile to browser storage.',
      };
    }
  },

  getProgress(): GameProgress {
    try {
      const data = localStorage.getItem(PROGRESS_KEY);
      if (!data) return DEFAULT_PROGRESS;
      const parsed = JSON.parse(data);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return DEFAULT_PROGRESS;
      }
      const xp = typeof parsed.xp === 'number' && parsed.xp >= 0 ? parsed.xp : 0;
      const existingRooms = Array.isArray(parsed.unlockedRoomIds)
        ? (parsed.unlockedRoomIds as RoomEnvironmentId[])
        : [];
      return {
        xp,
        gamesCompleted: typeof parsed.gamesCompleted === 'number' ? parsed.gamesCompleted : 0,
        bestScores:
          parsed.bestScores && typeof parsed.bestScores === 'object' ? parsed.bestScores : {},
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        unlockedRoomIds: computeUnlockedRooms(xp, existingRooms),
        interactionHistory: Array.isArray(parsed.interactionHistory)
          ? parsed.interactionHistory
          : [],
      };
    } catch {
      return DEFAULT_PROGRESS;
    }
  },

  saveProgress(progress: GameProgress): void {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
      console.error('Failed to save game progress:', e);
    }
  },

  recordGameCompletion(params: {
    gameId: GameId;
    gameTitle: string;
    score: number;
    xpReward: number;
  }): { progress: GameProgress; newAchievements: Achievement[]; newlyUnlockedRooms: RoomEnvironmentId[] } {
    const current = this.getProgress();
    const nextXp = current.xp + params.xpReward;
    const prevBest = current.bestScores[params.gameId] ?? 0;

    let achievements = [...current.achievements];
    achievements = addAchievementIfMissing(
      achievements,
      'first-play',
      'Playful Start',
      'Completed your first mini-game with Ātmiya.'
    );
    if (params.gameId === 'memory-match') {
      achievements = addAchievementIfMissing(
        achievements,
        'memory-master',
        'Memory Match Finisher',
        'Matched all pairs in Memory Match.'
      );
    } else if (params.gameId === 'quick-quiz') {
      achievements = addAchievementIfMissing(
        achievements,
        'quiz-whiz',
        'Curious Mind',
        'Completed a round of Quick Quiz.'
      );
    } else if (params.gameId === 'pattern-match') {
      achievements = addAchievementIfMissing(
        achievements,
        'pattern-pro',
        'Pattern Seeker',
        'Completed a Pattern Match session.'
      );
    }

    const nextRooms = computeUnlockedRooms(nextXp, current.unlockedRoomIds);
    const newlyUnlockedRooms = nextRooms.filter((r) => !current.unlockedRoomIds.includes(r));

    if (nextRooms.length >= 4) {
      achievements = addAchievementIfMissing(
        achievements,
        'theme-collector',
        'Room Stylist',
        'Unlocked all four cozy room atmospheres.'
      );
    }

    const newAchievements = achievements.filter(
      (a) => !current.achievements.some((prev) => prev.id === a.id)
    );

    const nextProgress: GameProgress = {
      xp: nextXp,
      gamesCompleted: current.gamesCompleted + 1,
      bestScores: {
        ...current.bestScores,
        [params.gameId]: Math.max(prevBest, params.score),
      },
      achievements,
      unlockedRoomIds: nextRooms,
      interactionHistory: [
        {
          id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          label: `Completed ${params.gameTitle} (Score: ${params.score})`,
          xpEarned: params.xpReward,
          timestamp: Date.now(),
        },
        ...current.interactionHistory,
      ].slice(0, 20),
    };

    this.saveProgress(nextProgress);
    return { progress: nextProgress, newAchievements, newlyUnlockedRooms };
  },

  recordInteraction(label: string, xpReward = 5): {
    progress: GameProgress;
    newlyUnlockedRooms: RoomEnvironmentId[];
  } {
    const current = this.getProgress();
    const nextXp = current.xp + xpReward;
    const nextRooms = computeUnlockedRooms(nextXp, current.unlockedRoomIds);
    const newlyUnlockedRooms = nextRooms.filter((r) => !current.unlockedRoomIds.includes(r));

    let achievements = [...current.achievements];
    achievements = addAchievementIfMissing(
      achievements,
      'warm-welcome',
      'Friendly Hello',
      'Shared an interactive moment with Ātmiya.'
    );

    const nextProgress: GameProgress = {
      ...current,
      xp: nextXp,
      achievements,
      unlockedRoomIds: nextRooms,
      interactionHistory: [
        {
          id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          label,
          xpEarned: xpReward,
          timestamp: Date.now(),
        },
        ...current.interactionHistory,
      ].slice(0, 20),
    };

    this.saveProgress(nextProgress);
    return { progress: nextProgress, newlyUnlockedRooms };
  },

  isHomeHintDismissed(): boolean {
    try {
      return localStorage.getItem(HOME_HINT_KEY) === 'true';
    } catch {
      return false;
    }
  },

  dismissHomeHint(): void {
    try {
      localStorage.setItem(HOME_HINT_KEY, 'true');
    } catch {
      // ignore storage failure
    }
  },

  getConversations(): ConversationSession[] {
    try {
      const data = localStorage.getItem(CONVERSATIONS_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((c): c is ConversationSession => Boolean(c && typeof c === 'object' && typeof c.id === 'string'))
        .map((c) => ({
          ...c,
          title: typeof c.title === 'string' ? c.title : 'Conversation',
          messages: Array.isArray(c.messages)
            ? c.messages.filter(
                (m) => Boolean(m && typeof m === 'object' && typeof m.content === 'string' && (m.role === 'user' || m.role === 'model'))
              )
            : [],
        }));
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
      appName: 'Ātmiya AI Companion',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(),
      settings: this.getSettings(),
      conversations: this.getConversations(),
      progress: this.getProgress(),
    };
    return JSON.stringify(exportObject, null, 2);
  },

  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return false;
      }

      let importedAny = false;
      if (data.profile && typeof data.profile === 'object' && !Array.isArray(data.profile)) {
        this.saveProfile({
          displayName: typeof data.profile.displayName === 'string' ? data.profile.displayName : '',
          avatarDataUrl:
            typeof data.profile.avatarDataUrl === 'string' ? data.profile.avatarDataUrl : undefined,
          bio: typeof data.profile.bio === 'string' ? data.profile.bio : '',
          onboardingCompleted: Boolean(data.profile.onboardingCompleted),
          createdAt: typeof data.profile.createdAt === 'number' ? data.profile.createdAt : Date.now(),
          updatedAt: Date.now(),
        });
        importedAny = true;
      }
      if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
        const mergedSettings: CompanionSettings = {
          ...DEFAULT_SETTINGS,
          ...data.settings,
          theme:
            data.settings.theme === 'light' || data.settings.theme === 'auto'
              ? data.settings.theme
              : 'dark',
          expressionsEnabled:
            typeof data.settings.expressionsEnabled === 'boolean'
              ? data.settings.expressionsEnabled
              : true,
          avatarConfig: {
            ...DEFAULT_AVATAR_CONFIG,
            ...(data.settings.avatarConfig && typeof data.settings.avatarConfig === 'object'
              ? data.settings.avatarConfig
              : {}),
          },
          roomConfig: {
            ...DEFAULT_ROOM_CONFIG,
            ...(data.settings.roomConfig && typeof data.settings.roomConfig === 'object'
              ? data.settings.roomConfig
              : {}),
          },
        };
        this.saveSettings(mergedSettings);
        importedAny = true;
      }
      if (Array.isArray(data.conversations)) {
        const validConversations = data.conversations
          .filter((c: any): c is ConversationSession => Boolean(c && typeof c === 'object' && typeof c.id === 'string'))
          .map((c: any) => ({
            ...c,
            title: typeof c.title === 'string' ? c.title : 'Conversation',
            messages: Array.isArray(c.messages) ? c.messages : [],
          }));
        this.saveConversations(validConversations);
        if (validConversations.length > 0) {
          this.setActiveConversationId(validConversations[0].id);
        }
        importedAny = true;
      }
      if (data.progress && typeof data.progress === 'object' && !Array.isArray(data.progress)) {
        const xp = typeof data.progress.xp === 'number' ? data.progress.xp : 0;
        const rooms = Array.isArray(data.progress.unlockedRoomIds)
          ? data.progress.unlockedRoomIds
          : [];
        this.saveProgress({
          ...DEFAULT_PROGRESS,
          ...data.progress,
          xp,
          unlockedRoomIds: computeUnlockedRooms(xp, rooms),
        });
        importedAny = true;
      }
      return importedAny;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  },
};
