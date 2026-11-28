import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { pathnameForTab, resolveTabFromPathname } from '../src/utils/navigation';
import { storage } from '../src/services/storage';

const origLocalStorage = (globalThis as any).localStorage;

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

describe('Storage Persistence, Sanitization, History/Progress & Direct-Route Mapping', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = new MemoryStorage();
  });

  afterEach(() => {
    (globalThis as any).localStorage = origLocalStorage;
  });

  it('resolves and serializes all 4 primary routes safely', () => {
    assert.equal(resolveTabFromPathname('/'), 'home');
    assert.equal(resolveTabFromPathname('/history'), 'history');
    assert.equal(resolveTabFromPathname('/history/'), 'history');
    assert.equal(resolveTabFromPathname('/play'), 'play');
    assert.equal(resolveTabFromPathname('/settings'), 'settings');
    assert.equal(resolveTabFromPathname('/learning'), 'home');
    assert.equal(resolveTabFromPathname('/memories'), 'home');
    assert.equal(resolveTabFromPathname('/unknown/nested'), 'home');

    assert.equal(pathnameForTab('home'), '/');
    assert.equal(pathnameForTab('history'), '/history');
    assert.equal(pathnameForTab('play'), '/play');
    assert.equal(pathnameForTab('settings'), '/settings');
  });

  it('persists conversations, tracks active session fallback, and unlocks rooms on Play completions', () => {
    const c1 = storage.createConversation('calm', 'auto');
    const c2 = storage.createConversation('friendly', 'hi');

    storage.updateConversation(c1.id, {
      title: 'Evening Check-in',
      messages: [
        { id: 'm1', role: 'user', content: 'Hello', timestamp: Date.now() },
        { id: 'm2', role: 'model', content: 'Namaste!', timestamp: Date.now() },
      ],
    });

    assert.equal(storage.getConversations().length, 2);
    assert.equal(storage.getActiveConversationId(), c2.id);

    storage.deleteConversation(c2.id);
    assert.equal(storage.getConversations().length, 1);
    assert.equal(storage.getActiveConversationId(), c1.id);

    const reward1 = storage.recordGameCompletion({
      gameId: 'memory-match',
      gameTitle: 'Memory Match',
      score: 120,
      xpReward: 30,
    });
    assert.equal(reward1.progress.xp, 30);
    assert.ok(reward1.progress.unlockedRoomIds.includes('indigo-loft'));
    assert.ok(reward1.newAchievements.some((a) => a.id === 'memory-master'));

    storage.clearAllConversations();
    assert.equal(storage.getConversations().length, 0);
    assert.equal(storage.getActiveConversationId(), null);
  });

  it('sanitizes unsafe URLs in profile and settings imports while preserving valid exports', () => {
    const maliciousImport = JSON.stringify({
      profile: {
        displayName: '  Aarav  ',
        avatarDataUrl: 'javascript:alert(1)',
        bio: '  Calm mind  ',
        onboardingCompleted: true,
      },
      settings: {
        theme: 'light',
        avatarConfig: {
          customImagePath: '/avatars/atmiya.png',
          glbModelPath: 'javascript:evil()',
          threeWsModelUrl: 'data:text/html,<script>alert(1)</script>',
        },
      },
      conversations: [
        {
          id: 'conv_test_1',
          title: 'Imported Chat',
          createdAt: 1000,
          updatedAt: 2000,
          personality: 'calm',
          language: 'auto',
          messages: [{ id: '1', role: 'user', content: 'Hi', timestamp: 1500 }],
        },
      ],
      progress: { xp: 55, gamesCompleted: 2 },
    });

    assert.equal(storage.importData(maliciousImport), true);

    const profile = storage.getProfile();
    assert.equal(profile.displayName, 'Aarav');
    assert.equal(profile.bio, 'Calm mind');
    assert.equal(profile.avatarDataUrl, undefined);

    const settings = storage.getSettings();
    assert.equal(settings.theme, 'light');
    assert.equal(settings.avatarConfig.customImagePath, '');
    assert.equal(settings.avatarConfig.glbModelPath, '/models/atmiya-avatar.glb');

    const exported = JSON.parse(storage.exportAllData());
    assert.equal(exported.appName, 'Ātmiya AI Companion');
    assert.equal(exported.conversations.length, 1);
    assert.ok(exported.progress.unlockedRoomIds.includes('cream-solarium'));

    // Valid safe data:image URLs pass profile sanitization
    const savedOk = storage.saveProfile({
      ...profile,
      avatarDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    });
    assert.equal(savedOk.ok, true);
    assert.equal(storage.getProfile().avatarDataUrl, 'data:image/png;base64,iVBORw0KGgo=');
  });
});
