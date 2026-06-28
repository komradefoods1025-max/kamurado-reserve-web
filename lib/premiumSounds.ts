"use client";

export type PremiumSoundId =
  | "bookClose"
  | "cartAdd"
  | "cartThanks"
  | "goToDatetime"
  | "reservationThanks";

export type PremiumSoundTrigger =
  | "cart-item-tap"
  | "cart-add-button"
  | "reserve-button"
  | "reservation-submit-success"
  | "page-flip";

export const SOUND_ASSET_VERSION = 3;
export const CART_THANKS_SOUND_VERSION = 4;
export const GO_TO_DATETIME_SOUND_VERSION = 6;

export const PREMIUM_SOUND_FADE_IN_SEC = 0.005;
export const PREMIUM_SOUND_FADE_OUT_SEC = 0.03;
export const VOICE_PLAYBACK_RATE = 1.15;

export const GO_TO_DATETIME_MIN_NAV_DELAY_MS = 900;
export const GO_TO_DATETIME_PLAYBACK_DELAY_SEC = 0.1;
export const ORDER_RECEIVED_NAV_DELAY_MS = GO_TO_DATETIME_MIN_NAV_DELAY_MS;
export const RESERVE_DATETIME_PATH = "/reserve/datetime";
export const BOOK_CLOSE_ANIMATION_MS = 900;
export const RESERVATION_THANKS_DISPLAY_DELAY_MS = BOOK_CLOSE_ANIMATION_MS;

export const PAGE_FLIP_ANIMATION_MS = 450;
export const PAGE_FLIP_LIFT_MS = 100;
export const PAGE_FLIP_RUB_MS = 200;
export const PAGE_FLIP_LAND_MS = 150;

function versionedSoundSrc(path: string, version = SOUND_ASSET_VERSION): string {
  return `${path}?v=${version}`;
}

export const PAGE_FLIP_SOUND = {
  rub: {
    src: versionedSoundSrc("/sounds/page-flip.mp3"),
    volume: 0.55,
    startOffset: 0.02,
  },
  land: {
    src: versionedSoundSrc("/sounds/page-flip-land.mp3"),
    volume: 0.45,
    startOffset: 0.66,
    playDuration: 0.15,
  },
} as const;

export const PREMIUM_SOUNDS: Record<
  PremiumSoundId,
  {
    src: string;
    volume: number;
    startOffset?: number;
    playDuration?: number;
    playbackRate?: number;
    playbackDelaySec?: number;
  }
> = {
  cartAdd: {
    src: versionedSoundSrc("/sounds/cart-add.mp3"),
    volume: 0.35,
    startOffset: 0,
    playDuration: 0.42,
  },
  cartThanks: {
    src: versionedSoundSrc("/sounds/cart-thanks.mp3", CART_THANKS_SOUND_VERSION),
    volume: 0.5,
    playbackRate: VOICE_PLAYBACK_RATE,
  },
  goToDatetime: {
    src: versionedSoundSrc("/sounds/go-to-datetime.mp3", GO_TO_DATETIME_SOUND_VERSION),
    volume: 0.5,
    playbackRate: VOICE_PLAYBACK_RATE,
    playbackDelaySec: GO_TO_DATETIME_PLAYBACK_DELAY_SEC,
  },
  reservationThanks: {
    src: versionedSoundSrc("/sounds/reservation-thanks.mp3"),
    volume: 0.5,
    playbackRate: VOICE_PLAYBACK_RATE,
  },
  bookClose: {
    src: versionedSoundSrc("/sounds/book-close.mp3"),
    volume: 0.4,
    startOffset: 0,
    playDuration: 0.38,
  },
};

const ALLOWED_SOUND_TRIGGERS: Record<
  PremiumSoundId,
  ReadonlySet<PremiumSoundTrigger>
> = {
  cartAdd: new Set(["cart-item-tap"]),
  cartThanks: new Set(["cart-item-tap"]),
  goToDatetime: new Set(["reserve-button"]),
  reservationThanks: new Set(["reservation-submit-success"]),
  bookClose: new Set(["reservation-submit-success"]),
};

type SoundSegmentConfig = {
  src: string;
  volume: number;
  startOffset?: number;
  playDuration?: number;
  playbackRate?: number;
  playbackDelaySec?: number;
};

export type PlayPremiumSoundOptions = {
  enabled?: boolean;
  trigger: PremiumSoundTrigger;
};

let audioContext: AudioContext | null = null;
let unlocked = false;
let lifecycleHandlersInstalled = false;
const bufferCache = new Map<string, AudioBuffer>();
const fallbackAudios = new Map<string, HTMLAudioElement>();
const preloadElements: HTMLAudioElement[] = [];
const activeBufferSources = new Set<AudioBufferSourceNode>();
let pageFlipLandTimer: number | null = null;

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
  const existing = preloadElements.find((element) =>
    element.src.includes(src.split("?")[0] ?? src),
  );
  if (existing) {
    return existing;
  }

  const audio = document.createElement("audio");
  audio.preload = "metadata";
  audio.setAttribute("playsinline", "true");
  audio.src = src;
  audio.style.display = "none";
  document.body.appendChild(audio);
  preloadElements.push(audio);
  return audio;
}

function installLifecycleHandlers(): void {
  if (lifecycleHandlersInstalled || typeof window === "undefined") {
    return;
  }

  lifecycleHandlersInstalled = true;

  window.addEventListener("pagehide", () => {
    stopAllPremiumSounds();
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      stopAllPremiumSounds();
    }
  });
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

function registerActiveSource(source: AudioBufferSourceNode): void {
  activeBufferSources.add(source);
  source.onended = () => {
    activeBufferSources.delete(source);
  };
}

function playSilentUnlockPulse(context: AudioContext): void {
  try {
    const buffer = context.createBuffer(1, 1, context.sampleRate);
    const source = context.createBufferSource();
    source.buffer = buffer;

    const gain = context.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
    registerActiveSource(source);
  } catch {
    // Ignore environments that cannot unlock audio.
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
  const playbackRate = config.playbackRate ?? 1;
  const availableDuration = Math.max(buffer.duration - startOffset, 0);
  const bufferDuration = Math.min(
    config.playDuration ?? availableDuration,
    playDuration > 0 ? playDuration * playbackRate : availableDuration,
    availableDuration,
  );
  const wallClockDuration = bufferDuration / playbackRate;

  if (bufferDuration <= 0 || wallClockDuration <= 0) {
    return false;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  const gain = context.createGain();
  source.connect(gain);
  gain.connect(context.destination);

  const startAt = context.currentTime + scheduleDelaySec;
  const peak = config.volume;
  const fadeOutStart = Math.max(
    PREMIUM_SOUND_FADE_IN_SEC,
    wallClockDuration - PREMIUM_SOUND_FADE_OUT_SEC,
  );

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + PREMIUM_SOUND_FADE_IN_SEC);
  gain.gain.setValueAtTime(peak, startAt + fadeOutStart);
  gain.gain.linearRampToValueAtTime(0, startAt + wallClockDuration);

  source.start(startAt, startOffset, bufferDuration);
  registerActiveSource(source);
  return true;
}

function playWithWebAudio(
  config: SoundSegmentConfig,
  buffer: AudioBuffer,
): boolean {
  const playbackRate = config.playbackRate ?? 1;
  const startOffset = config.startOffset ?? 0;
  const availableDuration = Math.max(buffer.duration - startOffset, 0);
  const bufferPlayDuration = Math.min(
    config.playDuration ?? availableDuration,
    availableDuration,
  );

  return scheduleSegmentPlayback(
    config,
    buffer,
    bufferPlayDuration / playbackRate,
    config.playbackDelaySec ?? 0,
  );
}

function playWithFallback(config: SoundSegmentConfig): void {
  const audio = ensureFallbackAudio(config.src);
  const delayMs = Math.round((config.playbackDelaySec ?? 0) * 1000);

  const startPlayback = () => {
    try {
      audio.pause();
      audio.currentTime = config.startOffset ?? 0;
      audio.volume = config.volume;
      audio.playbackRate = config.playbackRate ?? 1;
      void audio.play().catch(() => {});
    } catch {
      // Ignore environments that cannot play audio.
    }
  };

  if (delayMs > 0) {
    window.setTimeout(startPlayback, delayMs);
    return;
  }

  startPlayback();
}

function pauseHtmlAudio(audio: HTMLAudioElement): void {
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // Ignore environments that cannot pause audio.
  }
}

function isTriggerAllowed(
  soundId: PremiumSoundId,
  trigger: PremiumSoundTrigger,
): boolean {
  return ALLOWED_SOUND_TRIGGERS[soundId].has(trigger);
}

export function stopAllPremiumSounds(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const source of activeBufferSources) {
    try {
      source.stop();
    } catch {
      // Ignore sources that already finished.
    }
  }
  activeBufferSources.clear();

  for (const src of getAllSoundSources()) {
    const fallback = fallbackAudios.get(src);
    if (fallback) {
      pauseHtmlAudio(fallback);
    }
  }

  for (const element of preloadElements) {
    pauseHtmlAudio(element);
  }

  if (pageFlipLandTimer !== null) {
    window.clearTimeout(pageFlipLandTimer);
    pageFlipLandTimer = null;
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

  installLifecycleHandlers();
  unlocked = true;

  const context = getOrCreateContext();
  if (context && context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Ignore unlock failures and fall back below.
    }
  }

  if (context) {
    playSilentUnlockPulse(context);
  }

  for (const src of getAllSoundSources()) {
    ensurePreloadElement(src);
  }

  await Promise.all(getAllSoundSources().map((src) => decodeSound(src)));
}

export async function playPageFlipSound(
  enabled = true,
  trigger: PremiumSoundTrigger = "page-flip",
): Promise<void> {
  if (
    !enabled ||
    !unlocked ||
    trigger !== "page-flip" ||
    typeof window === "undefined"
  ) {
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

  const landSec = PAGE_FLIP_LAND_MS / 1000;
  const rubSec = (PAGE_FLIP_LIFT_MS + PAGE_FLIP_RUB_MS) / 1000;

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
  if (pageFlipLandTimer !== null) {
    window.clearTimeout(pageFlipLandTimer);
  }
  pageFlipLandTimer = window.setTimeout(() => {
    pageFlipLandTimer = null;
    playWithFallback(PAGE_FLIP_SOUND.land);
  }, rubSec * 1000);
}

export async function playPremiumSound(
  soundId: PremiumSoundId,
  options: PlayPremiumSoundOptions,
): Promise<void> {
  const { enabled = true, trigger } = options;

  if (
    !enabled ||
    !unlocked ||
    !isTriggerAllowed(soundId, trigger) ||
    typeof window === "undefined"
  ) {
    return;
  }

  installLifecycleHandlers();

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

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function playPremiumSoundAndWait(
  soundId: PremiumSoundId,
  options: PlayPremiumSoundOptions,
): Promise<void> {
  const { enabled = true, trigger } = options;
  const minWait = waitMs(GO_TO_DATETIME_MIN_NAV_DELAY_MS);

  if (typeof window === "undefined") {
    return;
  }

  stopAllPremiumSounds();

  if (!enabled) {
    await minWait;
    return;
  }

  await unlockPremiumAudio();

  if (!unlocked || !isTriggerAllowed(soundId, trigger)) {
    await minWait;
    return;
  }

  installLifecycleHandlers();

  const config = PREMIUM_SOUNDS[soundId];
  const context = getOrCreateContext();

  if (context && context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Fall back below.
    }
  }

  const playbackDone = (async (): Promise<void> => {
    const buffer = await decodeSound(config.src);

    if (buffer && context) {
      return new Promise<void>((resolve) => {
        const playbackRate = config.playbackRate ?? 1;
        const startOffset = config.startOffset ?? 0;
        const availableDuration = Math.max(buffer.duration - startOffset, 0);
        const bufferDuration = Math.min(
          config.playDuration ?? availableDuration,
          availableDuration,
        );
        const wallClockDuration = bufferDuration / playbackRate;

        if (bufferDuration <= 0 || wallClockDuration <= 0) {
          resolve();
          return;
        }

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;

        const gain = context.createGain();
        source.connect(gain);
        gain.connect(context.destination);

        const playbackDelaySec = config.playbackDelaySec ?? 0;
        const startAt = context.currentTime + playbackDelaySec;
        const peak = config.volume;
        const fadeOutStart = Math.max(
          PREMIUM_SOUND_FADE_IN_SEC,
          wallClockDuration - PREMIUM_SOUND_FADE_OUT_SEC,
        );

        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(
          peak,
          startAt + PREMIUM_SOUND_FADE_IN_SEC,
        );
        gain.gain.setValueAtTime(peak, startAt + fadeOutStart);
        gain.gain.linearRampToValueAtTime(0, startAt + wallClockDuration);

        let settled = false;
        const finish = () => {
          if (settled) {
            return;
          }
          settled = true;
          resolve();
        };

        source.onended = finish;
        window.setTimeout(
          finish,
          Math.ceil((wallClockDuration + playbackDelaySec) * 1000) + 120,
        );

        source.start(startAt, startOffset, bufferDuration);
        registerActiveSource(source);
      });
    }

    return new Promise<void>((resolve) => {
      const audio = ensureFallbackAudio(config.src);
      const delayMs = Math.round((config.playbackDelaySec ?? 0) * 1000);

      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };

      audio.onended = finish;
      audio.onerror = finish;

      const startPlayback = () => {
        try {
          audio.pause();
          audio.currentTime = config.startOffset ?? 0;
          audio.volume = config.volume;
          audio.playbackRate = config.playbackRate ?? 1;
          void audio.play().catch(finish);
          window.setTimeout(finish, 5000);
        } catch {
          finish();
        }
      };

      if (delayMs > 0) {
        window.setTimeout(startPlayback, delayMs);
        return;
      }

      startPlayback();
    });
  })();

  try {
    await Promise.all([minWait, playbackDone]);
  } catch {
    await minWait;
  }
}

export async function playGoToDatetimeNavigationSound(
  enabled = true,
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  stopAllPremiumSounds();

  try {
    await playPremiumSoundAndWait("goToDatetime", {
      enabled,
      trigger: "reserve-button",
    });
  } catch {
    await waitMs(GO_TO_DATETIME_MIN_NAV_DELAY_MS);
  }
}
