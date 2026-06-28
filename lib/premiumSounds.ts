"use client";

export type PremiumSoundId = "cartAdd" | "reservationComplete";

export const PREMIUM_SOUND_FADE_IN_SEC = 0.005;
export const PREMIUM_SOUND_FADE_OUT_SEC = 0.03;

export const PAGE_FLIP_ANIMATION_MS = 850;
export const PAGE_FLIP_LAND_MS = 150;

export const PAGE_FLIP_SOUND = {
  rub: {
    src: "/sounds/page-flip.mp3",
    volume: 0.55,
    startOffset: 0.04,
  },
  land: {
    src: "/sounds/page-flip-land.mp3",
    volume: 0.45,
    startOffset: 0.62,
    playDuration: 0.16,
  },
} as const;

export const PREMIUM_SOUNDS: Record<
  PremiumSoundId,
  {
    src: string;
    volume: number;
    startOffset?: number;
    playDuration?: number;
  }
> = {
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

type SoundSegmentConfig = {
  src: string;
  volume: number;
  startOffset?: number;
  playDuration?: number;
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

function scheduleSegmentPlayback(
  config: SoundSegmentConfig,
  buffer: AudioBuffer,
  playDuration: number,
  scheduleDelaySec: number,
): boolean {
  const context = getOrCreateContext();
  if (!context) {
    return false;
  }

  const startOffset = config.startOffset ?? 0;
  const availableDuration = Math.max(buffer.duration - startOffset, 0);
  const segmentDuration = Math.min(
    config.playDuration ?? playDuration,
    playDuration,
    availableDuration,
  );

  if (segmentDuration <= 0) {
    return false;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;

  const gain = context.createGain();
  source.connect(gain);
  gain.connect(context.destination);

  const startAt = context.currentTime + scheduleDelaySec;
  const peak = config.volume;
  const fadeOutStart = Math.max(
    PREMIUM_SOUND_FADE_IN_SEC,
    segmentDuration - PREMIUM_SOUND_FADE_OUT_SEC,
  );

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + PREMIUM_SOUND_FADE_IN_SEC);
  gain.gain.setValueAtTime(peak, startAt + fadeOutStart);
  gain.gain.linearRampToValueAtTime(0, startAt + segmentDuration);

  source.start(startAt, startOffset, segmentDuration);
  return true;
}

function playWithWebAudio(
  config: SoundSegmentConfig,
  buffer: AudioBuffer,
): boolean {
  const availableDuration = Math.max(
    buffer.duration - (config.startOffset ?? 0),
    0,
  );
  const playDuration = Math.min(
    config.playDuration ?? availableDuration,
    availableDuration,
  );

  return scheduleSegmentPlayback(config, buffer, playDuration, 0);
}

function playWithFallback(config: SoundSegmentConfig): void {
  const audio = ensureFallbackAudio(config.src);

  try {
    audio.currentTime = config.startOffset ?? 0;
    audio.volume = config.volume;
    void audio.play().catch(() => {});
  } catch {
    // Ignore environments that cannot play audio.
  }
}

function getAllSoundSources(): string[] {
  return [
    PAGE_FLIP_SOUND.rub.src,
    PAGE_FLIP_SOUND.land.src,
    ...Object.values(PREMIUM_SOUNDS).map((config) => config.src),
  ];
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
    getAllSoundSources().map(async (src) => {
      ensurePreloadElement(src);

      const audio = ensureFallbackAudio(src);
      try {
        audio.load();
        audio.volume = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
      } catch {
        // Ignore unlock failures for individual clips.
      }

      await decodeSound(src);
    }),
  );
}

export async function playPageFlipSound(enabled = true): Promise<void> {
  if (!enabled || !unlocked || typeof window === "undefined") {
    return;
  }

  const context = getOrCreateContext();
  if (context && context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Fall back below.
    }
  }

  const animationSec = PAGE_FLIP_ANIMATION_MS / 1000;
  const landSec = PAGE_FLIP_LAND_MS / 1000;
  const rubSec = animationSec - landSec;

  const rubBuffer = await decodeSound(PAGE_FLIP_SOUND.rub.src);
  const landBuffer = await decodeSound(PAGE_FLIP_SOUND.land.src);

  if (rubBuffer && landBuffer && context) {
    const rubPlayed = scheduleSegmentPlayback(
      PAGE_FLIP_SOUND.rub,
      rubBuffer,
      rubSec,
      0,
    );
    const landPlayed = scheduleSegmentPlayback(
      PAGE_FLIP_SOUND.land,
      landBuffer,
      PAGE_FLIP_SOUND.land.playDuration ?? landSec,
      rubSec,
    );

    if (rubPlayed && landPlayed) {
      return;
    }
  }

  playWithFallback(PAGE_FLIP_SOUND.rub);
  window.setTimeout(() => {
    playWithFallback(PAGE_FLIP_SOUND.land);
  }, rubSec * 1000);
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
  if (buffer && context && playWithWebAudio(config, buffer)) {
    return;
  }

  playWithFallback(config);
}
