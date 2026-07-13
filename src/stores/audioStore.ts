import { create } from "zustand";
import { storageService } from "@/services/storageService";

const AUDIO_PREFS_KEY = "abar:audio-prefs";
const AMBIENT_TRACK_URL = "/audio/freesound_community-bar-chatter-5979.mp3";
const DEFAULT_VOLUME = 0.15;

interface AudioPrefs {
  volume: number;
  muted: boolean;
}

function loadPrefs(): AudioPrefs {
  const raw = storageService.getItem(AUDIO_PREFS_KEY);
  if (!raw) return { volume: DEFAULT_VOLUME, muted: false };
  try {
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : DEFAULT_VOLUME,
      muted: !!parsed.muted,
    };
  } catch {
    return { volume: DEFAULT_VOLUME, muted: false };
  }
}

function savePrefs(prefs: AudioPrefs): void {
  storageService.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs));
}

let audioEl: HTMLAudioElement | null = null;

function ensureAudioElement(volume: number, muted: boolean): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio(AMBIENT_TRACK_URL);
    audioEl.loop = true;
    audioEl.volume = volume;
    audioEl.muted = muted;
  }
  return audioEl;
}

interface AudioStoreState {
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  /** Browsers block audio-with-sound until a user gesture; call on first click/keydown anywhere. Safe to call repeatedly — it's a no-op once playback has actually started. */
  ensureStarted: () => void;
}

export const useAudioStore = create<AudioStoreState>((set, get) => ({
  ...loadPrefs(),

  setVolume: (volume: number) => {
    const clamped = Math.min(1, Math.max(0, volume));
    set({ volume: clamped });
    const el = ensureAudioElement(clamped, get().muted);
    el.volume = clamped;
    savePrefs({ volume: clamped, muted: get().muted });
  },

  toggleMute: () => {
    const muted = !get().muted;
    set({ muted });
    const el = ensureAudioElement(get().volume, muted);
    el.muted = muted;
    savePrefs({ volume: get().volume, muted });
  },

  ensureStarted: () => {
    const el = ensureAudioElement(get().volume, get().muted);
    if (!el.paused) return;
    el.play().catch(() => {
      // Autoplay still blocked (e.g. gesture didn't count) — the next gesture will retry.
    });
  },
}));

if (typeof window !== "undefined") {
  const startOnFirstGesture = () => useAudioStore.getState().ensureStarted();
  window.addEventListener("pointerdown", startOnFirstGesture, { once: true });
  window.addEventListener("keydown", startOnFirstGesture, { once: true });
}
