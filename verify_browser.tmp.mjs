import { spawn } from 'node:child_process';
import fs from 'node:fs';
import WebSocket from 'ws';

const CHROME_BIN = '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';
const TARGET_URL = 'http://localhost:3000';
const CDP_PORT = 9226;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getWsDebuggerUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('Timed out waiting for CDP endpoint');
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const events = [];

    ws.on('open', () => {
      const send = (method, params = {}, timeoutMs = 15000) =>
        new Promise((res, rej) => {
          const id = nextId++;
          const timer = setTimeout(() => {
            if (pending.has(id)) {
              pending.delete(id);
              rej(new Error(`CDP timeout after ${timeoutMs}ms: ${method}`));
            }
          }, timeoutMs);
          pending.set(id, {
            res: (v) => { clearTimeout(timer); res(v); },
            rej: (e) => { clearTimeout(timer); rej(e); },
            method,
          });
          ws.send(JSON.stringify({ id, method, params }));
        });
      resolve({ ws, send, events });
    });

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id) {
        const entry = pending.get(msg.id);
        if (entry) {
          pending.delete(msg.id);
          if (msg.error) entry.rej(new Error(`${entry.method}: ${msg.error.message}`));
          else entry.res(msg.result);
        }
      } else if (msg.method) {
        events.push(msg);
      }
    });

    ws.on('error', reject);
  });
}

async function evalJs(send, expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
  }
  return res.result?.value;
}

async function screenshot(send, filename) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, 20000);
  fs.writeFileSync(filename, Buffer.from(data, 'base64'));
}

async function run() {
  const userDataDir = `/tmp/cdp_atmiya_${Date.now()}`;
  const chrome = spawn(
    CHROME_BIN,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--window-size=1280,800',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let client;
  try {
    const wsUrl = await getWsDebuggerUrl();
    client = await createCdpClient(wsUrl);
    const { send, events } = client;

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        // 1. Deterministic speechSynthesis observer/mock for headless shell (no OS TTS voices)
        window.__ttsLog = [];
        window.__activeUtterance = null;
        window.__ttsTimers = [];
        const clearTtsTimers = () => {
          while (window.__ttsTimers.length) clearTimeout(window.__ttsTimers.pop());
        };
        const synthMock = {
          speaking: false,
          pending: false,
          paused: false,
          getVoices: () => [],
          cancel: () => {
            clearTtsTimers();
            const u = window.__activeUtterance;
            window.__activeUtterance = null;
            synthMock.speaking = false;
            window.__ttsLog.push({ event: 'cancel' });
            if (u && typeof u.onerror === 'function') {
              try { u.onerror({ error: 'canceled' }); } catch {}
            }
          },
          pause: () => {
            synthMock.paused = true;
            if (window.__activeUtterance?.onpause) window.__activeUtterance.onpause();
          },
          resume: () => {
            synthMock.paused = false;
            if (window.__activeUtterance?.onresume) window.__activeUtterance.onresume();
          },
          speak: (utterance) => {
            clearTtsTimers();
            window.__activeUtterance = utterance;
            synthMock.speaking = true;
            const text = utterance.text || '';
            window.__ttsLog.push({ event: 'speak', text });
            const t1 = setTimeout(() => {
              if (window.__activeUtterance !== utterance) return;
              if (typeof utterance.onstart === 'function') utterance.onstart();
              const words = text.split(/\\s+/);
              let offset = 0;
              words.slice(0, 10).forEach((w, idx) => {
                const charIdx = offset;
                offset += w.length + 1;
                const bt = setTimeout(() => {
                  if (window.__activeUtterance !== utterance || typeof utterance.onboundary !== 'function') return;
                  utterance.onboundary({ name: 'word', charIndex: charIdx });
                }, 180 * (idx + 1));
                window.__ttsTimers.push(bt);
              });
            }, 30);
            const durMs = text.length > 100 ? 25000 : Math.max(2200, text.length * 60);
            const tEnd = setTimeout(() => {
              if (window.__activeUtterance !== utterance) return;
              window.__activeUtterance = null;
              synthMock.speaking = false;
              window.__ttsLog.push({ event: 'end', text });
              if (typeof utterance.onend === 'function') utterance.onend();
            }, durMs);
            window.__ttsTimers.push(t1, tEnd);
          },
        };
        try {
          Object.defineProperty(window, 'speechSynthesis', { value: synthMock, configurable: true });
        } catch {
          window.speechSynthesis = synthMock;
        }

        // 2. Deterministic /api/chat and /api/tts mock when testing browser animation flows
        const origFetch = window.fetch.bind(window);
        let chatTurn = 0;
        window.fetch = async (input, init) => {
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          if (url.includes('/api/chat')) {
            chatTurn += 1;
            const replyPayload = chatTurn === 1
              ? {
                  reply: 'Stars shine through nuclear fusion deep inside their cores, where immense gravity fuses hydrogen atoms into helium and releases vast steady energy across space. That radiant balance keeps stars glowing warmly for billions of years.',
                  emotion: 'happy',
                  intensity: 0.8,
                }
              : {
                  reply: 'Yes, would you like to explore another topic next?',
                  emotion: 'curious',
                  intensity: 0.72,
                };
            return new Response(JSON.stringify(replyPayload), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          if (url.includes('/api/tts')) {
            // Force immediate fallback to speechSynthesis timeline so we can verify pause/boundary/interrupt deterministically
            return new Response(JSON.stringify({ error: 'TTS_TEST_BROWSER_FALLBACK' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return origFetch(input, init);
        };
      `,
    });

    await send('Page.navigate', { url: TARGET_URL });
    await sleep(1600);

    let readyInfo = null;
    for (let i = 0; i < 60; i++) {
      readyInfo = await evalJs(
        send,
        `(() => {
          const canvas = document.querySelector('canvas');
          const rect = canvas ? canvas.getBoundingClientRect() : null;
          const bodyText = document.body.innerText;
          return {
            hasCanvas: Boolean(canvas),
            width: rect?.width || 0,
            height: rect?.height || 0,
            hasLoading: bodyText.includes('Loading 3D Companion') || bodyText.includes('Preparing 3D Scene'),
            ttsLog: window.__ttsLog || [],
          };
        })()`
      );
      if (readyInfo.hasCanvas && readyInfo.width > 400 && !readyInfo.hasLoading) break;
      await sleep(250);
    }

    console.log('1. Startup readiness:', readyInfo);
    if (!readyInfo.hasCanvas || readyInfo.width < 200) {
      throw new Error('3D Canvas did not mount properly');
    }

    await sleep(450);
    await screenshot(send, 'tmp_m2_home_greet.png');
    await sleep(3200);

    // 2. Wave button
    const waveClicked = await evalJs(
      send,
      `(() => {
        const waveBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Wave');
        if (!waveBtn) return false;
        waveBtn.click();
        return true;
      })()`
    );
    console.log('2. Wave clicked:', waveClicked);
    await sleep(600);
    await screenshot(send, 'tmp_m2_wave.png');
    await sleep(2500);

    // 3. Long AI speech turn (explanation) via real UI input + Send button
    await send('Page.bringToFront');
    const focused1 = await evalJs(
      send,
      `(() => {
        const input = document.querySelector('input[placeholder*="Tap to speak or type"]');
        if (!input) return false;
        input.focus();
        input.click();
        return document.activeElement === input;
      })()`
    );
    await send('Input.insertText', { text: 'How do stars shine?' });
    await sleep(100);
    const send1 = await evalJs(
      send,
      `(() => {
        const input = document.querySelector('input[placeholder*="Tap to speak or type"]');
        const sendBtn = document.querySelector('button[aria-label="Send message"]');
        const disabled = sendBtn ? sendBtn.disabled : true;
        if (sendBtn && !disabled) sendBtn.click();
        return { focused: ${focused1}, val: input?.value || '', disabled };
      })()`
    );
    console.log('3. Chat turn 1 sent:', send1);

    let speakingSeen = false;
    for (let i = 0; i < 40; i++) {
      const st = await evalJs(
        send,
        `({
          speaking: Boolean(window.speechSynthesis?.speaking),
          stopBtn: Boolean(document.querySelector('button[aria-label="Stop speaking"]')),
          ttsLog: window.__ttsLog,
        })`
      );
      if (st.speaking && st.stopBtn) {
        speakingSeen = true;
        break;
      }
      await sleep(150);
    }
    console.log('4. Speaking state active:', speakingSeen);
    if (!speakingSeen) throw new Error('Expected avatar speaking state and Stop button');

    await sleep(300);
    await screenshot(send, 'tmp_m2_speaking.png');

    // 5. Mid-speech interruption via Stop button
    const interrupted = await evalJs(
      send,
      `(() => {
        const stopBtn = document.querySelector('button[aria-label="Stop speaking"]');
        if (!stopBtn) return false;
        stopBtn.click();
        return true;
      })()`
    );
    await sleep(650);
    const afterStop = await evalJs(
      send,
      `({ speaking: Boolean(window.speechSynthesis?.speaking), stopBtn: Boolean(document.querySelector('button[aria-label="Stop speaking"]')) })`
    );
    console.log('5. Mid-speech Stop clicked:', interrupted, 'After stop:', afterStop);
    if (!interrupted || afterStop.speaking || afterStop.stopBtn) {
      throw new Error('Stop button did not cleanly interrupt speech');
    }

    // 6. Consecutive speech turn (question)
    await evalJs(
      send,
      `(() => {
        const input = document.querySelector('input[placeholder*="Tap to speak or type"]');
        input?.focus();
        return Boolean(input);
      })()`
    );
    await send('Input.insertText', { text: 'Ready for next?' });
    await sleep(100);
    await evalJs(
      send,
      `(() => {
        const sendBtn = document.querySelector('button[aria-label="Send message"]');
        if (sendBtn && !sendBtn.disabled) sendBtn.click();
        return Boolean(sendBtn);
      })()`
    );
    await sleep(2800);
    const turn2End = await evalJs(
      send,
      `({ speaking: Boolean(window.speechSynthesis?.speaking), ttsCount: (window.__ttsLog || []).filter((x) => x.event === 'speak').length })`
    );
    console.log('6. Consecutive turn settled:', turn2End);

    // 7. Repeated Home <-> Play navigation (3 rounds)
    for (let round = 1; round <= 3; round++) {
      await evalJs(
        send,
        `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Play');
          btn?.click();
          return Boolean(btn);
        })()`
      );
      await sleep(350);
      await evalJs(
        send,
        `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Home');
          btn?.click();
          return Boolean(btn);
        })()`
      );
      await sleep(900);
      console.log('7.' + round + ' Play <-> Home cycle ok');
    }

    // Wait for GLB remount after final Home navigation
    let postNavReady = null;
    for (let i = 0; i < 40; i++) {
      postNavReady = await evalJs(
        send,
        `(() => {
          const canvas = document.querySelector('canvas');
          const rect = canvas ? canvas.getBoundingClientRect() : null;
          const bodyText = document.body.innerText;
          return {
            hasCanvas: Boolean(canvas),
            width: rect?.width || 0,
            height: rect?.height || 0,
            hasLoading: bodyText.includes('Loading 3D Companion') || bodyText.includes('Preparing 3D Scene'),
          };
        })()`
      );
      if (postNavReady.hasCanvas && postNavReady.width > 400 && !postNavReady.hasLoading) break;
      await sleep(250);
    }
    await sleep(500);
    await screenshot(send, 'tmp_m2_after_nav.png');
    console.log('8. Post-navigation 3D stage:', postNavReady);

    const waveAfterNav = await evalJs(
      send,
      `(() => {
        const waveBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Wave');
        waveBtn?.click();
        return Boolean(waveBtn);
      })()`
    );
    console.log('9. Wave after repeated navigation:', waveAfterNav);

    const consoleErrors = events
      .filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
      .map((e) => e.params.args?.map((a) => a.value ?? a.description).join(' '));
    const exceptions = events
      .filter((e) => e.method === 'Runtime.exceptionThrown')
      .map((e) => e.params.exceptionDetails?.text || 'Exception');

    console.log('Console errors:', consoleErrors);
    console.log('Uncaught exceptions:', exceptions);
    if (consoleErrors.length > 0 || exceptions.length > 0) {
      throw new Error(`Console/runtime errors: ${JSON.stringify({ consoleErrors, exceptions })}`);
    }

    console.log('BROWSER E2E VERIFICATION PASSED!');
  } finally {
    if (client?.ws) client.ws.close();
    chrome.kill('SIGKILL');
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
