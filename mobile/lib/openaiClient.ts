/**
 * openaiClient — GPT-4o-mini field extraction for voice logging.
 *
 * Uses the chat completions API with json_object response format.
 * Key is read from EXPO_PUBLIC_OPENAI_KEY (Metro inlines EXPO_PUBLIC_ vars at build time).
 * Falls back gracefully (returns {}) if the key is missing or the request fails.
 */

import type { CollectedFields } from './jumpAgent';

const BASE = 'https://api.openai.com/v1';

export const SAME_AS_LAST_RE = /\b(same|as\s+last|as\s+before|as\s+usual|as\s+always|previous|use\s+(?:the\s+)?previous)\b/i;

/** GPT sometimes returns these when no value is present — treat as missing. */
const INVALID_VALUE_RE = /^(unknown|n\/a|none|unspecified|not\s+(specified|mentioned|given|known)|unclear|null)$/i;

function getKey(): string {
  return (process.env.EXPO_PUBLIC_OPENAI_KEY ?? '').trim();
}

const SYSTEM_PROMPT = `You extract skydiving jump data from spoken transcripts.
Return ONLY a flat JSON object. Include only fields that are clearly mentioned — never guess.

Fields:
- jumpNumber    integer  — the jump number (e.g. 847)
- dzName        string   — name of the skydiving facility / dropzone, title-cased.
                           Accept ANY proper noun or business name that the jumper uses to identify where they jumped,
                           including names like "Commando Skydivers", "Skydive Sydney", "Chicagoland Skydiving", etc.
                           The jumper may say "dropzone was X", "drop zone was X", "I jumped at X", "out of X", or
                           speech-recognition may mishear "dropzone" as "drops on", "drop son", "drop zone" — treat all
                           the same way and extract whatever name follows as dzName.
                           IMPORTANT: Strip any leading "Dropzone", "Drop Zone", "DZ", "The Dropzone" prefix from the
                           extracted name. "Dropzone Commando Skydivers" → "Commando Skydivers",
                           "DZ Skydive Sydney" → "Skydive Sydney". Only keep the facility's own name.
- acType        string   — aircraft type, uppercase (e.g. "PAC 750XL", "CESSNA 182", "CARAVAN", "OTTER", "AIRVAN", "GA8 AIRVAN", "PORTER", "SKYVAN", "TWIN OTTER")
                           The jumper may say just the type without a rego; extract it if mentioned.
                           STT commonly mishears aircraft names — correct these automatically:
                           "arronn"→AIRVAN, "air van"→AIRVAN, "airbon"→AIRVAN, "air-van"→AIRVAN,
                           "aaron"→AIRVAN (when context is aircraft type, not NATO phonetic),
                           "erin"→AIRVAN, "era"→AIRVAN, "airvon"→AIRVAN,
                           "carven"→CARAVAN, "grand carven"→GRAND CARAVAN, "carry van"→CARAVAN.
- acRego        string   — aircraft registration, uppercase letters+digits only, no spaces (e.g. "VHPXM")
                           The user may give the rego in ONE of two ways — handle both:
                           (A) Spelled-out letters: "S X K", "V H S X K", "the rego is S X K" → take each spoken letter directly: "SXK", "VHSXK".
                           (B) NATO phonetic alphabet: each word/phrase = exactly ONE letter, no extras.
                               Alpha→A, Bravo→B, Charlie→C, Delta→D, Echo→E, Foxtrot→F,
                               Golf→G, Hotel→H, India→I, Juliet→J, Kilo→K, Lima→L, Mike→M,
                               November→N, Oscar→O, Papa→P, Quebec→Q, Romeo→R, Sierra→S,
                               Tango→T, Uniform→U, Victor→V, Whiskey→W, Yankee→Y, Zulu→Z.
                               X-RAY SPECIAL RULE: "X-ray", "x-ray", "x ray", "xray", "extra" (in rego context)
                               ALL map to the single letter X. The word "ray" is NOT Romeo — do NOT add R.
                               "Sierra X-ray Kilo" → S + X + K → "SXK" (3 phonetics = 3 letters, never 4).
                               "Victor Hotel Sierra X-ray Kilo" → V+H+S+X+K → "VHSXK".
                           Mixed input is fine: "Victor Hotel S X K" → "VHSXK".
                           Also handle: "Aaron"→A, "Niner"→9.
                           Common STT mishears — correct automatically:
                           "killer"→K, "radio"→R, "tango"/"tangle"→T, "fox"/"foxes"→F.
- exitAlt       integer  — exit altitude in feet (e.g. 14000)
- ffSecs        integer  — freefall duration in seconds (e.g. 60)
                           Can be as low as 1s (hop-and-pop deployments). Max ~120s.
                           STT often garbles numbers — if the transcript shows a suspicious noise digit before
                           a plausible value (e.g. "3 45 seconds", "3 4 5 seconds"), ignore the leading noise
                           and take the plausible number: "3 45 seconds" → 45s, "3 4 5 seconds" → 45s.
- canopyTime    string   — canopy time as "m:ss" (e.g. "4:30" for 4 min 30 sec)
- jumpType      string   — MUST be one of exactly (use the closest match):
                           Belly, Tracking, Wingsuit, Freefly, CRW, AFF, Tandem, Coach, Demo, Night, Camera Flying
                           Common spoken variants to map:
                           "angles"/"angle flying"→Tracking, "belly fly"→Belly, "ff"→Freefly,
                           "camera"→Camera Flying, "cam"→Camera Flying, "crw"/"canopy relative work"→CRW,
                           "tandem"→Tandem, "student"→AFF, "coach jump"→Coach, "night jump"→Night,
                           "demo jump"→Demo, "display"→Demo.
- canopyType    string   — parachute model and size, e.g. "PD Sabre 2 150", "Pilot 168", "Silhouette 190", "Katana 107"
- notes         string   — any extra remarks the jumper mentioned
- isFav         boolean  — was this a special/favourite jump? ONLY set to true if the user
                           explicitly says "favourite", "fav", "special jump", "loved it", etc.
                           If not mentioned, omit this field entirely — do NOT default to false.
- peopleOnJump  integer  — number of people on the jump. Extract from:
                           • Explicit counts: "4 way" → 4, "2-way" → 2, "8 way" → 8, "solo" → 1, "tandem" → 2
                           • Named people: always count the speaker as 1. "me and Varun" → 2,
                             "me, Jake, and Mira" → 3, "me and two others" → 3, "add me and Sam" → 2.
                           • "add [names] on the jump" → count total people including speaker.
                           Do NOT infer from jump type alone when no people are mentioned.
- jumpDate     string   — date of the jump as ISO "YYYY-MM-DD". Only extract if the user explicitly
                           mentions a specific date (e.g. "yesterday", "June 3rd", "last Saturday",
                           "today at 2pm"). Calculate relative dates using today's date provided below.
                           NEVER extract a date that is in the future relative to today's date.
                           Omit if no date is mentioned at all.
- jumpTime     string   — time of the jump as 24h "HH:MM" (e.g. "14:30" for 2:30 PM, "09:00" for 9 AM).
                           Only extract if the user mentions a specific clock time. Omit if not mentioned.
- pullAlt      integer  — pull/deployment altitude in feet. Only extract if the user explicitly mentions
                           when they pulled or deployed. e.g. "pulled at 4000" → 4000. Omit if not mentioned.
- landingAccuracy string — landing accuracy as "<number> <unit>" where unit is CM, M, or FT.
                           e.g. "2 metres" → "2 M", "50 centimetres" → "50 CM", "3 feet" → "3 FT",
                           "dead centre" or "on the pea" → "0 M".
                           Only extract if explicitly mentioned. Omit if not mentioned.
- jumperType   string   — MUST be exactly "Licensed" or "Student".
                           "Student" if the user says student, AFF, AFF jump, tandem student, etc.
                           "Licensed" if the user says licensed, fun jumper, etc.
                           Omit if not mentioned — do NOT default.

Rules:
• Convert NATO phonetic letters (Victor→V, Hotel→H, Papa→P, X-ray→X, Mike→M, etc.) — especially for acRego
• Convert number words ("fourteen thousand" → 14000, "sixty" → 60)
• Convert time phrases ("4 and a half minutes" → "4:30", "five minutes" → "5:00", "4 thirty" → "4:30", "two minutes 30 seconds" → "2:30", "one minute 20 seconds" → "1:20")
• "fourteen grand" = 14000 feet
• If the user says "AFF stage 1" or "AFF 3" → jumpType is "AFF"
• If the user says "same canopy", "same aircraft", "same as last time", "same plane", "same chute", "as usual", "previous", "use the previous", or similar — use the values provided in the context note below (if present). Do NOT invent values if no context is provided.
• IMPORTANT: The "Last jump gear" context note is ONLY to resolve "same as last" phrases. Do NOT use it as a default value for acType, acRego, or canopyType when the user mentions a different aircraft or canopy. If the user says any aircraft name (even an unusual one), extract that name — do NOT substitute the hint value.`;

export async function extractJumpFieldsAI(
  transcript: string,
  hint?: { suggestedJumpNumber?: number; lastGear?: { acType: string; acRego: string; canopyType?: string } },
): Promise<Partial<CollectedFields>> {
  const key = getKey();
  if (!key || !transcript.trim()) return {};

  const hintNote = hint?.suggestedJumpNumber
    ? ` (Context: the user's next expected jump number is ${hint.suggestedJumpNumber})`
    : '';

  const todayNote = ` Today's date is ${new Date().toISOString().slice(0, 10)} — use this to resolve relative dates like "yesterday" or "last Saturday".`;

  const gearNote = hint?.lastGear
    ? ` Last jump gear — aircraft: ${hint.lastGear.acType} rego ${hint.lastGear.acRego}${hint.lastGear.canopyType ? `, canopy: ${hint.lastGear.canopyType}` : ''}. If the user says "same", "as last time", "same aircraft", "same canopy", or similar, use these values.`
    : '';

  try {
    console.log('[GPT] sending transcript:', JSON.stringify(transcript));
    const resp = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Extract jump fields from this transcript${hintNote}${gearNote}${todayNote}: "${transcript}"`,
          },
        ],
      }),
    });

    if (!resp.ok) {
      console.warn('[GPT] request failed, status:', resp.status);
      return {};
    }

    const json = await resp.json();
    const raw = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
    console.log('[GPT] raw:', JSON.stringify(raw));

    // Sanitize — never trust raw AI values
    const out: Partial<CollectedFields> = {};
    // GPT sometimes returns numbers as strings — accept both
    const asNum = (v: unknown): number | null => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? null : n; }
      return null;
    };
    const jn = asNum(raw.jumpNumber);
    if (jn !== null && jn > 0 && jn < 100000) out.jumpNumber = Math.round(jn);
    if (typeof raw.dzName === 'string' && raw.dzName.trim().length >= 2)
      out.dzName = raw.dzName.trim();
    if (typeof raw.acType === 'string') {
      const at = raw.acType.trim();
      if (SAME_AS_LAST_RE.test(at)) {
        if (hint?.lastGear?.acType) out.acType = hint.lastGear.acType;
      } else if (at.length >= 2 && !INVALID_VALUE_RE.test(at)) {
        out.acType = at.toUpperCase();
      }
    }
    if (typeof raw.acRego === 'string' && raw.acRego.trim().length >= 2) {
      const regoRaw = raw.acRego.trim();
      if (SAME_AS_LAST_RE.test(regoRaw)) {
        if (hint?.lastGear?.acRego) out.acRego = hint.lastGear.acRego;
      } else {
        const rego = regoRaw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        // 5-char regos (e.g. VHSXK) → "VH-SXK" (country prefix + suffix)
        // 3-char regos (e.g. SXK)   → "SXK" (suffix only)
        // Other lengths              → as-is
        out.acRego = rego.length === 5 ? `${rego.slice(0, 2)}-${rego.slice(2)}` : rego;
      }
    }
    const ea = asNum(raw.exitAlt);
    if (ea !== null && ea >= 500 && ea <= 30000) out.exitAlt = Math.round(ea);
    const ff = asNum(raw.ffSecs);
    // Min 1s (hop-and-pop), max 600s. Reject obvious STT noise (0 or negative).
    if (ff !== null && ff >= 1 && ff <= 600) out.ffSecs = Math.round(ff);
    if (typeof raw.canopyTime === 'string' && /^\d+:\d{2}$/.test(raw.canopyTime.trim())) {
      const ct = raw.canopyTime.trim();
      const [mins, secs] = ct.split(':').map(Number);
      const totalSecs = mins * 60 + secs;
      // Reject 0:00 and very short canopy times (GPT hallucination). Min 10s.
      if (totalSecs >= 10) out.canopyTime = ct;
    }
    if (typeof raw.jumpType === 'string' && raw.jumpType.trim()) {
      const VALID_JUMP_TYPES = ['Belly', 'Tracking', 'Wingsuit', 'Freefly', 'CRW', 'AFF', 'Tandem', 'Coach', 'Demo', 'Night', 'Camera Flying'];
      const jt = raw.jumpType.trim();
      const exact = VALID_JUMP_TYPES.find(v => v.toLowerCase() === jt.toLowerCase());
      const starts = !exact && VALID_JUMP_TYPES.find(v => jt.toLowerCase().startsWith(v.toLowerCase()));
      const contains = !exact && !starts && VALID_JUMP_TYPES.find(v => jt.toLowerCase().includes(v.toLowerCase()));
      const matched = exact ?? starts ?? contains ?? null;
      if (matched) out.jumpType = matched;
    }
    if (typeof raw.canopyType === 'string') {
      const ct = raw.canopyType.trim();
      if (SAME_AS_LAST_RE.test(ct)) {
        if (hint?.lastGear?.canopyType) out.canopyType = hint.lastGear.canopyType;
        // else: unresolvable — leave blank so agent will ask
      } else if (ct.length >= 2 && !INVALID_VALUE_RE.test(ct)) {
        out.canopyType = ct;
      }
    }
    if (typeof raw.notes === 'string' && raw.notes.trim() && !SAME_AS_LAST_RE.test(raw.notes.trim()))
      out.notes = raw.notes.trim();
    // Only accept isFav:true — false just means GPT defaulted it (user didn't mention it)
    if (raw.isFav === true)
      out.isFav = true;
    const poj = asNum(raw.peopleOnJump);
    if (poj !== null && poj >= 1 && poj <= 200) out.peopleOnJump = Math.round(poj);
    if (typeof raw.jumpDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.jumpDate.trim())) {
      const d = raw.jumpDate.trim();
      const today = new Date().toISOString().slice(0, 10);
      if (d <= today) out.jumpDate = d;
    }
    if (typeof raw.jumpTime === 'string' && /^\d{2}:\d{2}$/.test(raw.jumpTime.trim()))
      out.jumpTime = raw.jumpTime.trim();
    const pa = asNum(raw.pullAlt);
    if (pa !== null && pa >= 100 && pa <= 20000) out.pullAlt = Math.round(pa);
    if (typeof raw.landingAccuracy === 'string') {
      const la = raw.landingAccuracy.trim().toUpperCase();
      if (/^\d+(\.\d+)?\s*(CM|M|FT)$/.test(la)) out.landingAccuracy = la;
    }
    if (raw.jumperType === 'Licensed' || raw.jumperType === 'Student')
      out.jumperType = raw.jumperType;

    console.log('[GPT] extracted:', JSON.stringify(out));
    return out;
  } catch (err) {
    console.error('[GPT] exception:', err);
    return {};
  }
}
