export type AtlasSoundCue =
  | 'drop-confirm'
  | 'correct-location'
  | 'score-reward'
  | 'round-end'
  | 'round-transition'
  | 'expedition-complete';

export interface AtlasSoundOptions {
  /** Scales the cue from restrained (0) to full (1). */
  intensity?: number;
}

interface Tone {
  delay: number;
  duration: number;
  frequency: number;
  endFrequency?: number;
  gain: number;
  type: 'sine' | 'triangle';
}

type AudioContextConstructor = new () => AudioContext;

const SILENCE = 0.0001;

export const ATLAS_SOUND_MUTED_STORAGE_KEY = 'playstead:atlas-sound-muted';

const CUES: Record<AtlasSoundCue, readonly Tone[]> = {
  'drop-confirm': [
    {
      delay: 0,
      duration: 0.11,
      frequency: 310,
      endFrequency: 190,
      gain: 0.045,
      type: 'triangle',
    },
    {
      delay: 0.025,
      duration: 0.09,
      frequency: 155,
      endFrequency: 120,
      gain: 0.035,
      type: 'sine',
    },
  ],
  'correct-location': [
    { delay: 0, duration: 0.16, frequency: 392, gain: 0.035, type: 'sine' },
    { delay: 0.1, duration: 0.2, frequency: 587.33, gain: 0.04, type: 'sine' },
  ],
  'score-reward': [
    { delay: 0, duration: 0.16, frequency: 523.25, gain: 0.03, type: 'triangle' },
    { delay: 0.075, duration: 0.18, frequency: 659.25, gain: 0.035, type: 'triangle' },
    { delay: 0.15, duration: 0.24, frequency: 783.99, gain: 0.04, type: 'triangle' },
  ],
  'round-end': [
    { delay: 0, duration: 0.2, frequency: 440, gain: 0.032, type: 'sine' },
    { delay: 0.12, duration: 0.25, frequency: 349.23, gain: 0.038, type: 'sine' },
  ],
  'round-transition': [
    {
      delay: 0,
      duration: 0.2,
      frequency: 261.63,
      endFrequency: 349.23,
      gain: 0.03,
      type: 'triangle',
    },
    {
      delay: 0.11,
      duration: 0.22,
      frequency: 392,
      endFrequency: 523.25,
      gain: 0.035,
      type: 'triangle',
    },
  ],
  'expedition-complete': [
    { delay: 0, duration: 0.22, frequency: 261.63, gain: 0.03, type: 'sine' },
    { delay: 0.09, duration: 0.25, frequency: 329.63, gain: 0.034, type: 'sine' },
    { delay: 0.18, duration: 0.28, frequency: 392, gain: 0.038, type: 'sine' },
    { delay: 0.3, duration: 0.38, frequency: 523.25, gain: 0.042, type: 'triangle' },
  ],
};

let audioContext: AudioContext | null = null;
let resumePromise: Promise<void> | null = null;
let muted: boolean | null = null;

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Returns the persisted Atlas Drop sound preference. Sound is on by default. */
export function isAtlasSoundMuted(): boolean {
  if (muted !== null) return muted;

  try {
    muted = browserStorage()?.getItem(ATLAS_SOUND_MUTED_STORAGE_KEY) === 'true';
  } catch {
    muted = false;
  }

  return muted;
}

/** Updates the Atlas Drop sound preference without requiring browser guards. */
export function setAtlasSoundMuted(nextMuted: boolean): void {
  muted = nextMuted;

  try {
    browserStorage()?.setItem(ATLAS_SOUND_MUTED_STORAGE_KEY, String(nextMuted));
  } catch {
    // Storage may be unavailable in private browsing or restricted embeds.
  }
}

/** Toggles the Atlas Drop sound preference and returns its new value. */
export function toggleAtlasSoundMuted(): boolean {
  const nextMuted = !isAtlasSoundMuted();
  setAtlasSoundMuted(nextMuted);
  return nextMuted;
}

function contextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;

  const audioWindow = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor;
  };

  return window.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function getContext(): AudioContext | null {
  if (audioContext && audioContext.state !== 'closed') return audioContext;

  const Constructor = contextConstructor();
  if (!Constructor) return null;

  try {
    audioContext = new Constructor();
    return audioContext;
  } catch {
    return null;
  }
}

async function readyContext(): Promise<AudioContext | null> {
  const context = getContext();
  if (!context) return null;

  if (context.state === 'suspended') {
    try {
      resumePromise ??= context.resume().finally(() => {
        resumePromise = null;
      });
      await resumePromise;
    } catch {
      return null;
    }
  }

  return context.state === 'running' ? context : null;
}

function scheduleTone(context: AudioContext, tone: Tone, startAt: number, intensity: number) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const toneStart = startAt + tone.delay;
  const toneEnd = toneStart + tone.duration;
  const attackEnd = toneStart + Math.min(0.018, tone.duration / 3);

  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(tone.frequency, toneStart);
  if (tone.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, toneEnd);
  }

  envelope.gain.setValueAtTime(SILENCE, toneStart);
  envelope.gain.exponentialRampToValueAtTime(tone.gain * intensity, attackEnd);
  envelope.gain.exponentialRampToValueAtTime(SILENCE, toneEnd);

  oscillator.connect(envelope);
  envelope.connect(context.destination);
  oscillator.addEventListener(
    'ended',
    () => {
      oscillator.disconnect();
      envelope.disconnect();
    },
    { once: true },
  );
  oscillator.start(toneStart);
  oscillator.stop(toneEnd + 0.02);
}

async function scheduleCue(cue: AtlasSoundCue, intensity: number) {
  const context = await readyContext();
  if (!context) return;

  const startAt = context.currentTime + 0.01;
  for (const tone of CUES[cue]) {
    scheduleTone(context, tone, startAt, intensity);
  }
}

/**
 * Plays a short Atlas Drop cue. Calls are safe to make during SSR and may be
 * ignored by browsers that have not granted audio playback yet.
 */
export function playAtlasSound(cue: AtlasSoundCue, options: AtlasSoundOptions = {}): void {
  const requestedIntensity = options.intensity ?? 1;
  const intensity = Math.min(1, Math.max(0, requestedIntensity));

  if (intensity === 0 || isAtlasSoundMuted()) return;

  void scheduleCue(cue, intensity).catch(() => {
    // Sound is progressive enhancement: audio failures must never interrupt a round.
  });
}
