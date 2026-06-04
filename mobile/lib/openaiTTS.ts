/**
 * openaiTTS — OpenAI TTS (nova voice) via tts-1 model, played with expo-audio.
 * Falls back to expo-speech if expo-audio is unavailable or the call fails.
 */

// expo-file-system v17+ (SDK 54+) moved legacy APIs to expo-file-system/legacy
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system');
import { Speech } from './speechRecognition';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _createAudioPlayer: ((source: any, opts?: any) => any) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _setAudioModeAsync: ((mode: any) => Promise<void>) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const expoAudio = require('expo-audio');
  _createAudioPlayer = expoAudio.createAudioPlayer;
  _setAudioModeAsync = expoAudio.setAudioModeAsync;
  console.log('[TTS] expo-audio loaded, createAudioPlayer:', typeof _createAudioPlayer);
} catch (e) {
  console.warn('[TTS] expo-audio unavailable, will use on-device fallback:', e);
}

const TTS_MODEL = 'tts-1';
const TTS_VOICE = 'nova';
const TTS_SPEED = 1.1;

let ttsGen = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentPlayer: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentSubscription: any = null;

// ── Pre-warm cache ─────────────────────────────────────────────────────────────
let warmEntry: { text: string; pathPromise: Promise<string | null> } | null = null;

async function fetchAndWriteWarm(text: string): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_KEY ?? '';
  if (!apiKey || !text.trim()) return null;
  try {
    const resp = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: TTS_MODEL, input: text, voice: TTS_VOICE, response_format: 'mp3', speed: TTS_SPEED }),
    });
    if (!resp.ok) return null;
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
    }
    const base64 = btoa(binary);
    const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    const path = `${cacheDir}agent_tts_warm.mp3`;
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    return path;
  } catch {
    return null;
  }
}

// Unused — kept as a no-op so callers that import it don't break.
let audioModeReady = false; // eslint-disable-line @typescript-eslint/no-unused-vars

/** Pre-fetches and caches TTS audio so speakAI can play with no network delay. */
export function prewarmTTS(text: string): void {
  if (!_createAudioPlayer || !text.trim()) return;
  if (warmEntry?.text === text) return;
  warmEntry = { text, pathPromise: fetchAndWriteWarm(text) };
}

function onDeviceFallback(text: string, onDone?: () => void) {
  console.warn('[TTS] using on-device fallback voice');
  Speech.speak(text, {
    language: 'en-AU',
    rate: 0.55,
    onDone:  () => onDone?.(),
    onError: () => onDone?.(),
  });
}

export async function speakAI(text: string, onDone?: () => void, onStarted?: () => void): Promise<void> {
  const myGen = ++ttsGen;

  // Stop any previous playback — must pause first or the OS audio hardware keeps playing
  if (currentSubscription) {
    try { currentSubscription.remove(); } catch { /* ignore */ }
    currentSubscription = null;
  }
  if (currentPlayer) {
    try { currentPlayer.pause(); } catch { /* ignore */ }
    try { currentPlayer.remove(); } catch { /* ignore */ }
    currentPlayer = null;
  }

  if (!_createAudioPlayer) {
    console.warn('[TTS] no expo-audio module');
    onDeviceFallback(text, onDone);
    return;
  }

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_KEY ?? '';
  if (!apiKey) {
    console.warn('[TTS] no API key');
    onDeviceFallback(text, onDone);
    return;
  }

  // ── Check pre-warm cache ───────────────────────────────────────────────────
  let prewarmPath: string | null = null;
  if (warmEntry?.text === text) {
    prewarmPath = await warmEntry.pathPromise;
    warmEntry = null; // consume
    if (ttsGen !== myGen) return;
  }

  try {
    // ── Resolve audio path: use pre-warm or fetch fresh ───────────────────────
    let path: string | null = prewarmPath ?? null;

    if (path) {
      console.log('[TTS] using pre-warmed audio');
    } else {
      // ── 1. Fetch audio from OpenAI ───────────────────────────────────────────
      console.log('[TTS] fetching OpenAI TTS, len:', text.length);
      const resp = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: TTS_MODEL,
          input: text,
          voice: TTS_VOICE,
          response_format: 'mp3',
          speed: TTS_SPEED,
        }),
      });

      if (!resp.ok) throw new Error(`OpenAI HTTP ${resp.status}: ${await resp.text()}`);
      if (ttsGen !== myGen) return;
      console.log('[TTS] fetch OK, status:', resp.status);

      // ── 2. Write MP3 to cache ──────────────────────────────────────────────
      const buffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const CHUNK = 8192; // safe for Function.apply stack limit
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
      }
      const base64 = btoa(binary);
      if (ttsGen !== myGen) return;

      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      path = `${cacheDir}agent_tts_${myGen}.mp3`;
      console.log('[TTS] writing to:', path, 'bytes:', bytes.length);
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (ttsGen !== myGen) return;
      console.log('[TTS] file written OK');
    }

    // ── 3. Restore audio session to speaker/playback before every TTS call ───
    // STT (expo-speech-recognition) reconfigures the iOS audio session to
    // recording mode (earpiece, ducked volume) between turns. Without this
    // reset the second and subsequent TTS calls play at very low volume.
    try {
      await _setAudioModeAsync?.({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false, // playback only → routes to speaker at full volume
        shouldDuckAndroid: true,
      });
      console.log('[TTS] audio mode restored to playback');
    } catch (e) {
      console.warn('[TTS] setAudioModeAsync failed (continuing):', e);
    }
    // Brief pause so iOS can fully transition the AVAudioSession from
    // recording mode to playback before we create the player.
    await new Promise<void>(r => setTimeout(r, 200));
    if (ttsGen !== myGen) return;

    // ── 4. Create player with fast status interval ────────────────────────────
    console.log('[TTS] creating player...');
    const player = _createAudioPlayer(
      { uri: path! },
      { updateInterval: 100 }   // 100ms polling for responsive onDone
    );
    currentPlayer = player;
    console.log('[TTS] player created, isLoaded:', player.isLoaded, 'playing:', player.playing);

    // ── 5. Subscribe to status updates ───────────────────────────────────────
    let hasPlayed = false;
    let lastStatusLog = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = player.addListener('playbackStatusUpdate', (status: any) => {
      if (ttsGen !== myGen) {
        subscription.remove();
        return;
      }
      // Only log on state changes to avoid spam
      const sig = `${status.isLoaded}|${status.playing}|${status.didJustFinish}`;
      if (sig !== lastStatusLog) {
        lastStatusLog = sig;
        console.log('[TTS] status →', JSON.stringify({
          isLoaded: status.isLoaded,
          playing: status.playing,
          didJustFinish: status.didJustFinish,
          error: status.error ?? null,
        }));
      }

      // Start playing once loaded
      if (!hasPlayed && status.isLoaded) {
        hasPlayed = true;
        try {
          player.play();
          console.log('[TTS] play() called');
          if (ttsGen === myGen) onStarted?.();
        } catch (e) {
          console.error('[TTS] play() threw:', e);
          subscription.remove();
          currentSubscription = null;
          try { player.remove(); } catch { /* ignore */ }
          currentPlayer = null;
          if (ttsGen === myGen) onDeviceFallback(text, onDone);
        }
      }

      if (status.didJustFinish) {
        console.log('[TTS] playback finished ✓');
        subscription.remove();
        currentSubscription = null;
        try { player.remove(); } catch { /* ignore */ }
        currentPlayer = null;
        onDone?.();
      }
    });
    currentSubscription = subscription;

    // Safety: if isLoaded already (sync), play immediately
    if (player.isLoaded && !hasPlayed) {
      hasPlayed = true;
      try {
        player.play();
        console.log('[TTS] play() called (sync, already loaded)');
        if (ttsGen === myGen) onStarted?.();
      } catch (e) {
        console.error('[TTS] play() threw (sync):', e);
        subscription.remove();
        currentSubscription = null;
        try { player.remove(); } catch { /* ignore */ }
        currentPlayer = null;
        if (ttsGen === myGen) onDeviceFallback(text, onDone);
      }
    }

  } catch (err) {
    console.error('[TTS] caught error:', err);
    if (ttsGen !== myGen) return;
    onDeviceFallback(text, onDone);
  }
}

export async function stopAITTS(): Promise<void> {
  ttsGen++;
  if (currentSubscription) {
    try { currentSubscription.remove(); } catch { /* ignore */ }
    currentSubscription = null;
  }
  if (currentPlayer) {
    try { currentPlayer.pause(); } catch { /* ignore */ }
    try { currentPlayer.remove(); } catch { /* ignore */ }
    currentPlayer = null;
  }
  try { Speech.stop(); } catch { /* ignore */ }
}
