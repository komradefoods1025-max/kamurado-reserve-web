"use client";

export type PremiumSoundId = "pageFlip" | "cartAdd" | "reservationComplete";

export const PREMIUM_SOUND_FADE_IN_SEC = 0.005;
export const PREMIUM_SOUND_FADE_OUT_SEC = 0.03;

export const PREMIUM_SOUNDS: Record<
  PremiumSoundId,
  {
    src: string;
    volume: number;
    startOffset?: number;
    playDuration?: number;
  }
> = {
  pageFlip: { src: "/sounds/page-flip.mp3", volume: 0.45 },
  cartAdd: {
    src: "/sounds/cart-add.mp3",
    volume: 0.35,
    startOffset: 0,
    playDuration: 0.42,
  },
  reservationComplete: {
    src: "/sounds/reservation-complete.mp3",
    volume: 0.5,
    startOffset: 0,
    playDuration: 1.1,
  },
};

let audioContext: AudioContext | null = null;
let unlocked = false;
const bufferCache = new Map<string, AudioBuffer>();
const fallbackAudios = new Map<string, HTMLAudioElement>();
const preloadElements: HTMLAudioElement[] = [];

function getOrCreateContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    const AudioContextCtor =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

function ensureFallbackAudio(src: string): HTMLAudioElement {
  const existing = fallbackAudios.get(src);
  if (existing) {
    return existing;
  }

  const audio = new Audio(src);
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  fallbackAudios.set(src, audio);
  return audio;
}

function ensurePreloadElement(src: string): HTMLAudioElement {
  const existing = preloadElements.find((element) => element.src.endsWith(src));
  if (existing) {
    return existing;
  }

  const audio = document.createElement("audio");
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  audio.src = src;
  audio.style.display = "none";
  document.body.appendChild(audio);
  preloadElements.push(audio);
  return audio;
}

async function decodeSound(src: string): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(src);
  if (cached) {
    return cached;
  }

  const context = getOrCreateContext();
  if (!context) {
    return null;
  }

  try {
    const response = await fetch(src);
    if (!response.ok) {
      return null;
    }

    const data = await response.arrayBuffer();
    const buffer = await context.decodeAudioData(data.slice(0));
    bufferCache.set(src, buffer);
    return buffer;
  } catch {
    return null;
  }
}

function playWithWebAudio(
  soundId: PremiumSoundId,
  config: (typeof PREMIUM_SOUNDS)[PremiumSoundId],
  buffer: AudioBuffer,
): boolean {
  const context = getOrCreateContext();
  if (!context) {
    return false;
  }

  const startOffset = config.startOffset ?? 0;
  const availableDuration = Math.max(buffer.duration - startOffset, 0);
  const playDuration = Math.min(
    config.playDuration ?? availableDuration,
    availableDuration,
  );

  if (playDuration <= 0) {
    return false;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;

  const gain = context.createGain();
  source.connect(gain);
  gain.connect(context.destination);

  const now = context.currentTime;
  const peak = config.volume;
  const fadeOutStart = Math.max(
    PREMIUM_SOUND_FADE_IN_SEC,
    playDuration - PREMIUM_SOUND_FADE_OUT_SEC,
  );

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + PREMIUM_SOUND_FADE_IN_SEC);
  gain.gain.setValueAtTime(peak, now + fadeOutStart);
  gain.gain.linearRampToValueAtTime(0, now + playDuration);

  source.start(now, startOffset, playDuration);
  return true;
}

function playWithFallback(
  config: (typeof PREMIUM_SOUNDS)[PremiumSoundId],
): void {
  const audio = ensureFallbackAudio(config.src);

  try {
    audio.currentTime = config.startOffset ?? 0;
    audio.volume = config.volume;
    void audio.play().catch(() => {});
  } catch {
    // Ignore environments that cannot play audio.
  }
}

export function isPremiumAudioUnlocked(): boolean {
  return unlocked;
}

export async function unlockPremiumAudio(): Promise<void> {
  if (typeof window === "undefined" || unlocked) {
    return;
  }

  unlocked = true;

  const context = getOrCreateContext();
  if (context && context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Ignore unlock failures and fall back to HTMLAudioElement.
    }
  }

  await Promise.all(
    (Object.keys(PREMIUM_SOUNDS) as PremiumSoundId[]).map(async (soundId) => {
      const config = PREMIUM_SOUNDS[soundId];
      ensurePreloadElement(config.src);

      const audio = ensureFallbackAudio(config.src);
      try {
        audio.load();
        audio.volume = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = config.startOffset ?? 0;
        audio.volume = config.volume;
      } catch {
        audio.volume = config.volume;
      }

      await decodeSound(config.src);
    }),
  );
}

export async function playPremiumSound(
  soundId: PremiumSoundId,
  enabled = true,
): Promise<void> {
  if (!enabled || !unlocked || typeof window === "undefined") {
    return;
  }

  const config = PREMIUM_SOUNDS[soundId];
  const context = getOrCreateContext();

  if (context && context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Fall back below.
    }
  }

  const buffer = await decodeSound(config.src);
  if (buffer && context && playWithWebAudio(soundId, config, buffer)) {
    return;
  }

  playWithFallback(config);
}
