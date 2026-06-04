/**
 * speechRecognition — safe wrappers around expo-speech and expo-speech-recognition.
 *
 * Both packages call requireNativeModule() at module evaluation time, which
 * throws in Expo Go (no native build). This module catches those errors and
 * exports safe stubs so the rest of the app still loads.
 */

type AnyListener = (...args: any[]) => void;

// ─── expo-speech (TTS) ────────────────────────────────────────────────────────
type SpeechOptions = {
  language?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: () => void;
};
type SpeechVoice = { identifier: string; name: string; quality: number; language: string };
type SpeechModule = {
  speak: (text: string, options?: SpeechOptions) => void;
  stop: () => Promise<void>;
  getAvailableVoicesAsync?: () => Promise<SpeechVoice[]>;
};

const _speechStub: SpeechModule = {
  speak: () => {},
  stop: () => Promise.resolve(),
};

let _speech: SpeechModule = _speechStub;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _speech = require('expo-speech');
} catch {
  // expo-speech native module unavailable (Expo Go / web)
}

export const Speech: SpeechModule = _speech;
export const speechAvailable: boolean = _speech !== _speechStub;

// ─── expo-speech-recognition (STT) ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sttModule: any = null;
let _useEvent: (event: string, listener: AnyListener) => void = (_e, _l) => {};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stt = require('expo-speech-recognition');
  _sttModule = stt.ExpoSpeechRecognitionModule;
  _useEvent = stt.useSpeechRecognitionEvent;
} catch {
  // expo-speech-recognition native module unavailable (Expo Go / web)
}

/** The native ExpoSpeechRecognitionModule, or null if unavailable. */
export const sttModule = _sttModule as {
  start: (opts: {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    continuous?: boolean;
  }) => void;
  stop: () => void;
  abort: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
} | null;

/** True when both STT and TTS native modules loaded successfully. */
export const sttAvailable: boolean = !!_sttModule;

/**
 * Drop-in replacement for useSpeechRecognitionEvent that is safe to call even
 * when the native module isn't present. The hook identity is stable so React's
 * rules of hooks are satisfied regardless of whether STT is available.
 */
export function useSafeRecognitionEvent(
  event: string,
  listener: AnyListener,
): void {
  _useEvent(event, listener);
}
