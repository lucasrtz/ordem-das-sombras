// Áudio do site: volume/mudo em localStorage, nada toca antes da primeira interação.
import { chooseVoUrl } from "./ddragon.js";

const KEY = "pds:audio";
const listeners = new Set();
let state = { volume: 0.5, muted: false };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved && typeof saved.volume === "number") state = { volume: saved.volume, muted: !!saved.muted };
} catch {
  /* storage indisponível */
}

let unlocked = false;
function unlock() {
  unlocked = true;
  window.removeEventListener("pointerdown", unlock, true);
  window.removeEventListener("keydown", unlock, true);
}
window.addEventListener("pointerdown", unlock, true);
window.addEventListener("keydown", unlock, true);

export const canPlayOgg = (() => {
  try {
    return new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== "";
  } catch {
    return false;
  }
})();

export function getAudio() {
  return state;
}
export function setAudio(patch) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ok */
  }
  if (voice) voice.volume = effective(VOICE_GAIN);
  listeners.forEach((fn) => fn(state));
}
export function subscribeAudio(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const SFX_GAIN = 0.55;
const VOICE_GAIN = 1;
const effective = (gain) => (state.muted ? 0 : Math.min(1, state.volume * gain));
const ready = () => unlocked && canPlayOgg && !state.muted && state.volume > 0;

const pool = new Map();
export function playSfx(url) {
  if (!ready()) return;
  let a = pool.get(url);
  if (!a) {
    a = new Audio(url);
    a.preload = "auto";
    pool.set(url, a);
  }
  a.volume = effective(SFX_GAIN);
  a.currentTime = 0;
  a.play().catch(() => {});
}
export function preloadSfx(urls) {
  if (!canPlayOgg) return;
  urls.forEach((u) => {
    if (pool.has(u)) return;
    const a = new Audio();
    a.preload = "auto";
    a.src = u;
    pool.set(u, a);
  });
}

let voice = null;
let lastHover = 0;
export function playHover(url) {
  const now = performance.now();
  if (now - lastHover < 60) return;
  lastHover = now;
  playSfx(url);
}

// Fala de seleção do campeão (pt_br, com fallback para a voz padrão).
export function playChampionVoice(key) {
  stopVoice();
  if (!ready() || !key) return;
  const a = new Audio(chooseVoUrl(key, "pt_br"));
  a.volume = effective(VOICE_GAIN);
  let triedDefault = false;
  a.onerror = () => {
    if (triedDefault || voice !== a) return;
    triedDefault = true;
    a.src = chooseVoUrl(key, "default");
    a.play().catch(() => {});
  };
  voice = a;
  a.play().catch(() => {});
}
export function stopVoice() {
  if (voice) {
    voice.pause();
    voice = null;
  }
}
