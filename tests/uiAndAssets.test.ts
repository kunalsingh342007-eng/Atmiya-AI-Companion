import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompanionAvatar } from '../src/components/Avatar/CompanionAvatar';
import { MessageList } from '../src/components/Chat/MessageList';
import { GameShell } from '../src/components/Game/GameShell';
import { DEFAULT_SETTINGS } from '../src/services/storage';

describe('UI Components, Asset Integrity, Long Text Layout & Theme Behavior', () => {
  it('verifies 3D GLB model and branding assets exist on disk with valid headers', () => {
    const root = process.cwd();
    const glbPath = path.join(root, 'public', 'models', 'atmiya-avatar.glb');
    const logoPath = path.join(root, 'public', 'assets', 'branding', 'atmiya-logo.png');
    const lotusPath = path.join(root, 'public', 'assets', 'branding', 'lotus-footer.png');

    assert.equal(fs.existsSync(glbPath), true);
    assert.equal(fs.existsSync(logoPath), true);
    assert.equal(fs.existsSync(lotusPath), true);

    const fd = fs.openSync(glbPath, 'r');
    const header = Buffer.alloc(4);
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);
    assert.equal(header.toString('ascii'), 'glTF');
  });

  it('renders CompanionAvatar fallback without referencing removed /avatars/atmiya.png path', () => {
    const html = renderToStaticMarkup(
      React.createElement(CompanionAvatar, {
        state: 'idle',
        emotion: 'neutral',
        config: {
          ...DEFAULT_SETTINGS.avatarConfig,
          avatarType: 'custom-image',
          customImagePath: '/avatars/atmiya.png',
        },
      })
    );

    assert.ok(html.includes('आ'));
    assert.equal(html.includes('/avatars/atmiya.png'), false);
  });

  it('renders long unbroken chat messages and code blocks with safe wrapping and overflow guards', () => {
    const longToken = 'X'.repeat(450);
    const html = renderToStaticMarkup(
      React.createElement(MessageList, {
        isThinking: false,
        settings: DEFAULT_SETTINGS,
        messages: [
          {
            id: 'u1',
            role: 'user',
            content: `Check this long string: ${longToken}`,
            timestamp: Date.now(),
          },
          {
            id: 'm1',
            role: 'model',
            content: '```ts\nconst greeting = "Namaste";\n```',
            timestamp: Date.now(),
          },
        ],
      })
    );

    assert.ok(html.includes(longToken));
    assert.ok(html.includes('[overflow-wrap:anywhere]'));
    assert.ok(html.includes('break-words'));
    assert.ok(html.includes('overflow-x-auto'));
  });

  it('renders strictly 4 primary navigation tabs in GameShell and preserves dark/light theme support in index.html', () => {
    const html = renderToStaticMarkup(
      React.createElement(GameShell, {
        activeTab: 'play',
        onSelectTab: () => {},
        profile: {
          displayName: 'Kunal',
          bio: 'Tester',
          onboardingCompleted: true,
          createdAt: 1,
          updatedAt: 1,
        },
        children: React.createElement('div', null, 'Child Content'),
      })
    );

    assert.ok(html.includes('Home'));
    assert.ok(html.includes('History'));
    assert.ok(html.includes('Play'));
    assert.ok(html.includes('Settings'));
    assert.equal(html.includes('Learning'), false);
    assert.equal(html.includes('Memories'), false);

    const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    assert.ok(indexHtml.includes("classList.toggle('dark', isDark)"));
    assert.ok(indexHtml.includes("colorScheme = isDark ? 'dark' : 'light'"));
  });
});
