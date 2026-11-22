// Reads lines out loud. ElevenLabs voices when the dev server has an API key
// (see vite.config.ts), otherwise the browser's built-in speech.

export type SpeakerRole = "narrator" | "manager" | "cook";

// ElevenLabs premade voices. Swap for your own voice IDs from the ElevenLabs voice library.
const VOICE_IDS: Record<SpeakerRole, string> = {
  narrator: "JBFqnCBsd6RMkjVDRZzb", // George
  manager: "21m00Tcm4TlvDq8ikWAM", // Rachel
  cook: "pNInz6obpgDQGcFmaJgB", // Adam
};

// Preferred built-in voices per role (first match wins).
const BROWSER_VOICES: Record<SpeakerRole, string[]> = {
  narrator: ["Daniel", "Google UK English Male", "Alex", "Arthur"],
  manager: ["Samantha", "Google US English", "Karen", "Ava"],
  cook: ["Fred", "Rishi", "Moira", "Google UK English Female", "Tessa"],
};

let soundOn = true;
let elevenFailed = false;
let current: HTMLAudioElement | null = null;
const cache = new Map<string, string>();
const listeners = new Set<() => void>();

export const isSoundOn = () => soundOn;
export function setSoundOn(on: boolean) {
  soundOn = on;
  if (!on) stopSpeaking();
  listeners.forEach((f) => f());
}
export function onSoundChange(f: () => void) {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}

export const voiceEngine = () => (__ELEVEN_TTS__ && !elevenFailed ? "ElevenLabs" : "Browser voice");

export function stopSpeaking() {
  if (current) {
    current.pause();
    current = null;
  }
  window.speechSynthesis?.cancel();
}

/** Speak a line and resolve when it finishes (or right away if sound is off). */
export async function speak(text: string, role: SpeakerRole): Promise<void> {
  if (!soundOn || !text.trim()) return;
  stopSpeaking();
  if (__ELEVEN_TTS__ && !elevenFailed) {
    try {
      await playEleven(text, role);
      return;
    } catch (e) {
      console.warn("ElevenLabs TTS failed, using the browser voice instead", e);
      elevenFailed = true;
      listeners.forEach((f) => f());
    }
  }
  await playBrowser(text, role);
}

async function playEleven(text: string, role: SpeakerRole) {
  const key = `${role}|${text}`;
  let url = cache.get(key);
  if (!url) {
    const res = await fetch(`/api/tts/${VOICE_IDS[role]}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5" }),
    });
    if (!res.ok) throw new Error(`TTS ${res.status}`);
    url = URL.createObjectURL(await res.blob());
    cache.set(key, url);
  }
  const audio = new Audio(url);
  current = audio;
  await new Promise<void>((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.onpause = () => resolve();
    audio.play().catch(() => resolve());
  });
}

function pickVoice(role: SpeakerRole) {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  for (const name of BROWSER_VOICES[role]) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  const idx = { narrator: 0, manager: 1, cook: 2 }[role];
  return voices[idx % Math.max(voices.length, 1)];
}

function playBrowser(text: string, role: SpeakerRole): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(role);
    if (v) u.voice = v;
    u.rate = role === "cook" ? 1.08 : 1;
    u.pitch = role === "manager" ? 1.05 : role === "cook" ? 0.92 : 1;
    // Safety net: some browsers never fire onend.
    const timer = window.setTimeout(resolve, Math.max(2500, text.length * 85));
    u.onend = u.onerror = () => {
      window.clearTimeout(timer);
      resolve();
    };
    synth.speak(u);
  });
}

// Voices load asynchronously in some browsers.
if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.getVoices();
