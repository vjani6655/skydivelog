/**
 * jumpAgent — rule-based voice conversation engine for logging a jump.
 *
 * Responsibilities:
 *  • Define the ordered list of fields to collect
 *  • Generate the agent's question / retry message for each field
 *  • Parse a raw STT transcript into a typed value for each field
 *  • Produce a human-readable summary of all collected fields
 *  • Persist / clear the collected data in AsyncStorage for new.tsx to pick up
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── AsyncStorage key ─────────────────────────────────────────────────────────
export const VOICE_PREFILL_KEY = '@jumplogs/voice_prefill';

// ─── Field definitions ────────────────────────────────────────────────────────
export type FieldKey =
  | 'jumpNumber'
  | 'dzName'
  | 'acType'
  | 'acRego'
  | 'exitAlt'
  | 'ffSecs'
  | 'canopyTime'
  | 'canopyType'
  | 'jumpType'
  | 'notes'
  | 'isFav'
  | 'peopleOnJump'
  | 'jumpDate'
  | 'jumpTime'
  | 'pullAlt'
  | 'landingAccuracy'
  | 'jumperType';

/** Data shape written to AsyncStorage and read by new.tsx */
export interface CollectedFields {
  jumpNumber?: number;
  dzName?: string;
  acType?: string;
  acRego?: string;
  exitAlt?: number;
  ffSecs?: number;
  canopyTime?: string; // "mm:ss" or plain seconds string
  canopyType?: string; // parachute model + size, e.g. "PD Sabre 2 150"
  jumpType?: string;
  notes?: string;
  isFav?: boolean;
  peopleOnJump?: number;
  jumpDate?: string;    // ISO "YYYY-MM-DD"
  jumpTime?: string;    // 24h "HH:MM"
  pullAlt?: number;     // pull/deployment altitude in feet
  landingAccuracy?: string; // e.g. "2 M", "3 FT", "50 CM"
  jumperType?: string;  // "Licensed" or "Student"
}

// Required fields — must all be collected before moving to summary
export const REQUIRED_FIELDS: FieldKey[] = [
  'jumpNumber', 'dzName', 'acType', 'acRego',
  'exitAlt', 'ffSecs', 'canopyTime', 'canopyType', 'jumpType',
];

// Optional fields — asked after required ones, with a "skip" option
export const OPTIONAL_FIELDS: FieldKey[] = ['notes', 'isFav', 'peopleOnJump', 'pullAlt', 'landingAccuracy', 'jumperType', 'jumpDate', 'jumpTime'];

export const FIELD_ORDER: FieldKey[] = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

export const JUMP_TYPES = [
  'Belly', 'Tracking', 'Wingsuit', 'Freefly', 'CRW',
  'AFF', 'Tandem', 'Coach', 'Demo', 'Night', 'Camera Flying',
];

// ─── Questions ────────────────────────────────────────────────────────────────
export function getQuestion(field: FieldKey): string {
  switch (field) {
    case 'jumpNumber':  return "What's your jump number?";
    case 'dzName':      return "Which dropzone did you jump at?";
    case 'acType':      return "What aircraft did you jump from? For example, PAC 750 or Cessna 182.";
    case 'acRego':      return "What's the aircraft registration? You can spell it out, like Victor Hotel Papa.";
    case 'exitAlt':     return "What was your exit altitude in feet?";
    case 'ffSecs':      return "How long was your freefall? For example, 60 seconds.";
    case 'canopyTime':  return "How long were you under canopy? For example, 4 minutes 30 seconds.";
    case 'canopyType':  return "What canopy did you jump? Say the brand and size, like PD Sabre 2 150 or Pilot 168. Or say \"same as last\" to use the previous one.";
    case 'jumpType':    return "What type of jump? Say belly, freefly, tracking, wingsuit, AFF, tandem, or coach.";
    case 'notes':       return "Any notes to add? Say skip to leave blank.";
    case 'isFav':       return "Was this a favourite jump? Say yes or no.";
    case 'peopleOnJump': return "How many people were on the jump? Say the number, like 4, or solo for 1. Or say skip.";
    case 'jumpDate':    return "What date was the jump? For example, June 3rd or yesterday. Or say skip.";
    case 'jumpTime':    return "What time was the jump? Say something like 2 PM or 2:30 PM. Or say skip.";
    case 'pullAlt':     return "What was your pull altitude? Say a number in feet, or say skip.";
    case 'landingAccuracy': return "Any landing accuracy to record? Say a distance like 2 metres or 50 centimetres. Or say skip.";
    case 'jumperType':  return "Were you a licensed jumper or a student on this jump?";
  }
}

export function getRetryMessage(field: FieldKey): string {
  switch (field) {
    case 'jumpNumber':  return "I didn't catch that. What's your jump number?";
    case 'dzName':      return "What's the name of the dropzone?";
    case 'acType':      return "What aircraft type? For example, PAC 750 or Cessna.";
    case 'acRego':      return "What's the aircraft rego? Spell it out letter by letter if needed.";
    case 'exitAlt':     return "What altitude in feet? For example, 14 thousand.";
    case 'ffSecs':      return "How many seconds was your freefall? For example, 60 seconds.";
    case 'canopyTime':  return "How long under canopy? For example, 4 minutes 30 seconds.";
    case 'canopyType':  return "What canopy? Give the brand and size, or say same as last.";
    case 'jumpType':    return "What jump type? Options: belly, freefly, tracking, wingsuit, AFF, tandem, or coach.";
    case 'notes':       return "Any notes to add? Say skip to skip.";
    case 'isFav':       return "Was it a favourite jump? Just say yes or no.";
    case 'peopleOnJump': return "How many people on the jump? Say a number or solo. Or skip.";
    case 'jumpDate':    return "What date was the jump? Say the date, or skip.";
    case 'jumpTime':    return "What time was the jump? Say a time like 2 PM. Or skip.";
    case 'pullAlt':     return "What pull altitude in feet? Or say skip.";
    case 'landingAccuracy': return "Landing accuracy — say a distance like 2 metres or 50 cm. Or skip.";
    case 'jumperType':  return "Licensed or student?";
  }
}

// ─── Number-word parser ───────────────────────────────────────────────────────
const WORD_NUMS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

function wordsToNumber(text: string): number | null {
  const t = text.toLowerCase().trim().replace(/,/g, '');
  const direct = parseFloat(t);
  if (!isNaN(direct)) return direct;

  const words = t.split(/[\s-]+/);
  let total = 0;
  let current = 0;
  let found = false;

  for (const word of words) {
    const n = WORD_NUMS[word];
    if (n === undefined) continue;
    found = true;
    if (n === 1000) {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else if (n === 100) {
      current = (current === 0 ? 1 : current) * 100;
    } else {
      current += n;
    }
  }
  total += current;
  return found ? total : null;
}

// ─── Field parsers ────────────────────────────────────────────────────────────
function parseJumpNumber(text: string): number | null {
  const t = text.toLowerCase().replace(/jump\s*(number|#|\bnum\b)?/i, '').trim();
  const n = wordsToNumber(t);
  if (n !== null && n > 0 && n < 100000) return Math.round(n);
  return null;
}

function parseDzName(text: string): string | null {
  const t = text.trim();
  if (t.length < 2) return null;
  // Title-case each word
  return t
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function parseAcType(text: string): string | null {
  const t = text.trim();
  if (t.length < 2) return null;
  return t.toUpperCase();
}

function parseAcRego(text: string): string | null {
  // Convert NATO phonetic alphabet words → letters
  const phonetic: Record<string, string> = {
    alpha: 'A', bravo: 'B', charlie: 'C', delta: 'D', echo: 'E', foxtrot: 'F',
    golf: 'G', hotel: 'H', india: 'I', juliet: 'J', kilo: 'K', lima: 'L',
    mike: 'M', november: 'N', oscar: 'O', papa: 'P', quebec: 'Q', romeo: 'R',
    sierra: 'S', tango: 'T', uniform: 'U', victor: 'V', whiskey: 'W',
    xray: 'X', 'x-ray': 'X', yankee: 'Y', zulu: 'Z',
    // Common STT mishears
    killer: 'K', radio: 'R',
  };
  let t = text.toLowerCase();
  for (const [word, letter] of Object.entries(phonetic)) {
    t = t.replace(new RegExp(`\\b${word}\\b`, 'gi'), letter);
  }
  // Strip non-alphanumeric and uppercase
  const rego = t.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (rego.length >= 2) return rego;
  return null;
}

function parseAltitude(text: string): number | null {
  const t = text.toLowerCase();
  // "14k", "14.5k"
  const kMatch = t.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  // "14 thousand"
  const thousandMatch = t.match(/(\d+(?:\.\d+)?)\s*thousand/);
  if (thousandMatch) return Math.round(parseFloat(thousandMatch[1]) * 1000);
  // Plain number or word-number
  const n = wordsToNumber(t);
  if (n !== null && n >= 500 && n <= 30000) return Math.round(n);
  return null;
}

function parseSeconds(text: string): number | null {
  const t = text.toLowerCase();
  // "4:30"
  const colonMatch = t.match(/(\d+):(\d+)/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  // "4 minutes 30 seconds" / "4 min 30 sec"
  const minSecMatch = t.match(/(\d+)\s*(?:minutes?|mins?)\s*(?:and\s*)?(\d+)\s*(?:seconds?|secs?)/);
  if (minSecMatch) return parseInt(minSecMatch[1]) * 60 + parseInt(minSecMatch[2]);
  // "4 and a half minutes"
  if (t.includes('half')) {
    const halfMatch = t.match(/(\d+)\s*(?:and\s*a?\s*)?half\s*(?:minutes?|mins?)/);
    if (halfMatch) return parseInt(halfMatch[1]) * 60 + 30;
  }
  // "4 minutes"
  const minOnlyMatch = t.match(/(\d+)\s*(?:minutes?|mins?)/);
  if (minOnlyMatch) return parseInt(minOnlyMatch[1]) * 60;
  // "60 seconds"
  const secOnlyMatch = t.match(/(\d+)\s*(?:seconds?|secs?)/);
  if (secOnlyMatch) return parseInt(secOnlyMatch[1]);
  // Plain word-number (last resort)
  return wordsToNumber(t);
}

function secondsToDisplay(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : String(secs);
}

function parseJumpType(text: string): string | null {
  const t = text.toLowerCase().trim();
  const exact = JUMP_TYPES.find(jt => jt.toLowerCase() === t);
  if (exact) return exact;
  const starts = JUMP_TYPES.find(jt => t.startsWith(jt.toLowerCase()));
  if (starts) return starts;
  const contains = JUMP_TYPES.find(jt => t.includes(jt.toLowerCase()));
  if (contains) return contains;
  // Handle common aliases
  if (t.includes('free fly') || t.includes('free-fly')) return 'Freefly';
  if (t.includes('wing')) return 'Wingsuit';
  if (t.includes('belly') || t.includes('relative work') || t.includes('rw')) return 'Belly';
  return null;
}

export function parseBoolean(text: string): boolean | null {
  const t = text.toLowerCase().trim();
  if (['yes', 'yeah', 'yep', 'yup', 'sure', 'absolutely', 'definitely', 'of course', 'totally'].some(w => t.includes(w))) return true;
  if (['no', 'nope', 'nah', 'not really', 'no thanks', 'negative'].some(w => t.includes(w))) return false;
  return null;
}

// ─── Parse result ─────────────────────────────────────────────────────────────
export type ParseResult =
  | { ok: true; value: CollectedFields[FieldKey] }
  | { ok: false };

const SKIP_WORDS = ['skip', 'none', 'nothing', 'no notes', 'blank', 'leave blank', 'pass'];

export function parseFieldValue(field: FieldKey, text: string): ParseResult {
  const lower = text.toLowerCase().trim();

  // Skip support for optional fields
  if (OPTIONAL_FIELDS.includes(field) && SKIP_WORDS.some(w => lower.includes(w))) {
    if (field === 'isFav') return { ok: true, value: false };
    if (field === 'peopleOnJump') return { ok: false }; // number field — skip means leave blank
    return { ok: true, value: '' };
  }

  switch (field) {
    case 'jumpNumber': {
      const v = parseJumpNumber(text);
      return v !== null ? { ok: true, value: v } : { ok: false };
    }
    case 'dzName': {
      const v = parseDzName(text);
      return v ? { ok: true, value: v } : { ok: false };
    }
    case 'acType': {
      const v = parseAcType(text);
      return v ? { ok: true, value: v } : { ok: false };
    }
    case 'acRego': {
      const v = parseAcRego(text);
      return v ? { ok: true, value: v } : { ok: false };
    }
    case 'exitAlt': {
      const v = parseAltitude(text);
      return v !== null ? { ok: true, value: v } : { ok: false };
    }
    case 'ffSecs': {
      const v = parseSeconds(text);
      return v !== null && v >= 5 && v <= 600 ? { ok: true, value: v } : { ok: false };
    }
    case 'canopyTime': {
      const v = parseSeconds(text);
      if (v !== null && v >= 30 && v <= 1800) {
        return { ok: true, value: secondsToDisplay(v) };
      }
      return { ok: false };
    }
    case 'canopyType': {
      const t = text.trim();
      return t.length >= 2 ? { ok: true, value: t } : { ok: false };
    }
    case 'jumpType': {
      const v = parseJumpType(text);
      return v ? { ok: true, value: v } : { ok: false };
    }
    case 'notes': {
      return { ok: true, value: text.trim() };
    }
    case 'isFav': {
      const v = parseBoolean(text);
      return v !== null ? { ok: true, value: v } : { ok: false };
    }
    case 'jumpDate': {
      // Handled by GPT; regex fallback is not practical for dates
      return { ok: false };
    }
    case 'jumpTime': {
      if (SKIP_WORDS.some(w => lower.includes(w))) return { ok: false };
      // 12h: "2 PM", "2:30 PM", "14:30", "1430"
      const m12 = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
      if (m12) {
        let h = parseInt(m12[1]);
        const m = parseInt(m12[2] ?? '0');
        if (m12[3] === 'pm' && h !== 12) h += 12;
        if (m12[3] === 'am' && h === 12) h = 0;
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
          return { ok: true, value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
      }
      // 24h: "14:30" or "1430"
      const m24 = lower.match(/(\d{2}):?(\d{2})/);
      if (m24) {
        const h = parseInt(m24[1]);
        const m = parseInt(m24[2]);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
          return { ok: true, value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
      }
      return { ok: false };
    }
    case 'pullAlt': {
      if (SKIP_WORDS.some(w => lower.includes(w))) return { ok: false };
      const v = parseAltitude(text);
      return v !== null && v >= 100 && v <= 20000 ? { ok: true, value: v } : { ok: false };
    }
    case 'landingAccuracy': {
      if (SKIP_WORDS.some(w => lower.includes(w))) return { ok: false };
      const numMatch = text.match(/(\d+(?:\.\d+)?)\s*(cm|centimetre|centimeter|m\b|metre|meter|ft|feet)/i);
      if (numMatch) {
        const unit = /cm|centimetre|centimeter/i.test(numMatch[2]) ? 'CM'
          : /ft|feet/i.test(numMatch[2]) ? 'FT'
          : 'M';
        return { ok: true, value: `${numMatch[1]} ${unit}` };
      }
      return { ok: false };
    }
    case 'jumperType': {
      if (SKIP_WORDS.some(w => lower.includes(w))) return { ok: false };
      if (lower.includes('student') || lower.includes('aff') || lower.includes('tandem')) return { ok: true, value: 'Student' };
      if (lower.includes('licensed') || lower.includes('licence') || lower.includes('license')) return { ok: true, value: 'Licensed' };
      return { ok: false };
    }
    default:
      return { ok: false };
  }
}

// ─── State navigation ─────────────────────────────────────────────────────────
export function getNextField(collected: CollectedFields): FieldKey | null {
  for (const field of FIELD_ORDER) {
    if (collected[field] === undefined) return field;
  }
  return null;
}

// ─── Confirmation display ─────────────────────────────────────────────────────
export function confirmationMessage(field: FieldKey, value: CollectedFields[FieldKey]): string {
  switch (field) {
    case 'jumpNumber':  return `Jump #${value}.`;
    case 'dzName':      return `Got it — ${value}.`;
    case 'acType':      return `${value}.`;
    case 'acRego':      return `Rego ${value}.`;
    case 'exitAlt':     return `Exit altitude ${(value as number).toLocaleString()} ft.`;
    case 'ffSecs':      return `Freefall ${value} seconds.`;
    case 'canopyTime':  return `Canopy time ${value}.`;
    case 'canopyType':  return `Canopy: ${value}.`;
    case 'jumpType':    return `${value} jump.`;
    case 'notes':       return value ? `Notes saved.` : `No notes.`;
    case 'isFav':       return value ? `Marked as favourite.` : `Not a favourite.`;
    case 'jumpDate':    return `Date set to ${value}.`;
    case 'jumpTime':    return `Time set to ${value}.`;
    case 'pullAlt':     return `Pull altitude ${(value as number).toLocaleString()} ft.`;
    case 'landingAccuracy': return `Landing accuracy ${value}.`;
    case 'jumperType':  return `${value} jumper.`;
    default:            return '';
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
export function summarizeCollected(collected: CollectedFields): string {
  const parts: string[] = [];
  if (collected.jumpNumber !== undefined) parts.push(`Jump #${collected.jumpNumber}`);
  if (collected.dzName)   parts.push(collected.dzName);
  if (collected.acType)   parts.push(`${collected.acType}${collected.acRego ? ' ' + collected.acRego : ''}`);
  if (collected.exitAlt)  parts.push(`${collected.exitAlt.toLocaleString()} ft`);
  if (collected.ffSecs)   parts.push(`${collected.ffSecs}s freefall`);
  if (collected.canopyTime) parts.push(`${collected.canopyTime} canopy`);
  if (collected.canopyType) parts.push(collected.canopyType);
  if (collected.jumpType) parts.push(collected.jumpType);
  if (collected.notes)    parts.push(`"${collected.notes}"`);
  if (collected.isFav)    parts.push('favourite');
  return parts.join(' · ');
}

// ─── Persistence ──────────────────────────────────────────────────────────────
export async function saveVoicePrefill(fields: CollectedFields): Promise<void> {
  await AsyncStorage.setItem(VOICE_PREFILL_KEY, JSON.stringify(fields));
}

export async function loadVoicePrefill(): Promise<CollectedFields | null> {
  const raw = await AsyncStorage.getItem(VOICE_PREFILL_KEY).catch(() => null);
  return raw ? JSON.parse(raw) : null;
}

export async function clearVoicePrefill(): Promise<void> {
  await AsyncStorage.removeItem(VOICE_PREFILL_KEY).catch(() => null);
}

// ─── Last-used gear ───────────────────────────────────────────────────────────
export interface LastUsedGear {
  acType: string;
  acRego: string;
  canopyType?: string;
}

const LAST_USED_GEAR_KEY = '@jumplogs/last_used_gear';

export async function saveLastUsedGear(fields: CollectedFields): Promise<void> {
  if (!fields.acType && !fields.canopyType) return;
  const gear: LastUsedGear = {
    acType: fields.acType ?? '',
    acRego: fields.acRego ?? '',
    canopyType: fields.canopyType,
  };
  await AsyncStorage.setItem(LAST_USED_GEAR_KEY, JSON.stringify(gear)).catch(() => null);
}

export async function loadLastUsedGear(): Promise<LastUsedGear | null> {
  const raw = await AsyncStorage.getItem(LAST_USED_GEAR_KEY).catch(() => null);
  return raw ? JSON.parse(raw) : null;
}

// ─── Field labels (for skip messages) ────────────────────────────────────────
export const FIELD_LABELS: Partial<Record<FieldKey, string>> = {
  jumpNumber:  'the jump number',
  dzName:      'the dropzone',
  acType:      'the aircraft type',
  acRego:      'the aircraft registration',
  exitAlt:     'the exit altitude',
  ffSecs:      'the freefall time',
  canopyTime:  'the canopy time',
  canopyType:  'the canopy type',
  jumpType:    'the jump type',
  jumpDate:    'the date',
  jumpTime:    'the time',
  pullAlt:     'the pull altitude',
  landingAccuracy: 'the landing accuracy',
  jumperType:  'the jumper type',
};

// ─── Validation warnings ──────────────────────────────────────────────────────
export interface ValidationWarning {
  field: FieldKey;
  value: CollectedFields[FieldKey];
  counterQuestion: string;
}

/**
 * Returns a counter-question if the extracted value looks suspicious.
 * Returns null if the value looks fine.
 */
export function validateFieldValue(
  field: FieldKey,
  value: CollectedFields[FieldKey],
  hint?: { suggestedJumpNumber?: number },
): ValidationWarning | null {
  switch (field) {
    case 'exitAlt': {
      const alt = value as number;
      if (alt < 3000) {
        return {
          field, value,
          counterQuestion: `Only ${alt.toLocaleString()} feet exit altitude? Most skydives exit above ten thousand. Did you mean ${alt} thousand feet?`,
        };
      }
      if (alt > 25000) {
        return {
          field, value,
          counterQuestion: `${alt.toLocaleString()} feet — that's above commercial aircraft cruise altitude. Can you confirm that's right?`,
        };
      }
      break;
    }
    case 'ffSecs': {
      const secs = value as number;
      if (secs < 15) {
        return {
          field, value,
          counterQuestion: `Only ${secs} seconds of freefall — is that right? That's unusually short.`,
        };
      }
      if (secs > 240) {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return {
          field, value,
          counterQuestion: `${m} minutes and ${s > 0 ? s + ' seconds' : ''} of freefall — that's a long time. Is that right?`,
        };
      }
      break;
    }
    case 'canopyTime': {
      const str = value as string;
      const parts = str.split(':').map(Number);
      const totalSecs = parts.length === 2 ? parts[0] * 60 + parts[1] : NaN;
      if (!isNaN(totalSecs)) {
        if (totalSecs < 60) {
          return {
            field, value,
            counterQuestion: `Under a minute under canopy? That sounds very short. Is that right?`,
          };
        }
        if (totalSecs > 1500) {
          return {
            field, value,
            counterQuestion: `${parts[0]} minutes under canopy — that's quite long. Can you confirm?`,
          };
        }
      }
      break;
    }
    case 'peopleOnJump': {
      const n = value as number;
      return {
        field, value,
        counterQuestion: n === 1
          ? `Just you on this one — solo? Is that right?`
          : `There were ${n} people on this jump — is that right?`,
      };
    }
    case 'jumpDate': {
      const today = new Date().toISOString().slice(0, 10);
      if ((value as string) > today) {
        return {
          field, value,
          counterQuestion: `That date is in the future — did you mean today or a past date?`,
        };
      }
      break;
    }
    case 'jumpNumber': {
      const jn = value as number;
      const suggested = hint?.suggestedJumpNumber;
      if (suggested && Math.abs(jn - suggested) > 100 && Math.abs(jn - suggested) < 5000) {
        return {
          field, value,
          counterQuestion: `I was expecting jump ${suggested} as your next jump — you said ${jn}. Is that right, or did you mean ${suggested}?`,
        };
      }
      break;
    }
  }
  return null;
}
