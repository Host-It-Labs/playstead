import { afterEach, describe, expect, it, vi } from 'vitest';

interface AudioMock {
  context: {
    currentTime: number;
    destination: object;
    state: 'closed' | 'running' | 'suspended';
    createGain: ReturnType<typeof vi.fn>;
    createOscillator: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
  };
  oscillators: Array<{
    frequency: {
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      setValueAtTime: ReturnType<typeof vi.fn>;
    };
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }>;
}

function installAudioMock(state: 'closed' | 'running' | 'suspended' = 'running'): AudioMock {
  const oscillators: AudioMock['oscillators'] = [];
  const createGain = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {
      exponentialRampToValueAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
    },
  }));
  const createOscillator = vi.fn(() => {
    const oscillator = {
      addEventListener: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      frequency: {
        exponentialRampToValueAtTime: vi.fn(),
        setValueAtTime: vi.fn(),
      },
      start: vi.fn(),
      stop: vi.fn(),
      type: 'sine',
    };
    oscillators.push(oscillator);
    return oscillator;
  });
  const context = {
    currentTime: 4,
    destination: {},
    state,
    createGain,
    createOscillator,
    resume: vi.fn(async () => {
      context.state = 'running';
    }),
  };

  class AudioContextMock {
    constructor() {
      return context;
    }
  }

  vi.stubGlobal('window', { AudioContext: AudioContextMock });
  return { context, oscillators };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('Atlas audio cues', () => {
  it('is a safe no-op outside the browser', async () => {
    vi.stubGlobal('window', undefined);
    const { playAtlasSound } = await import('./atlasAudio');

    expect(() => playAtlasSound('drop-confirm')).not.toThrow();
  });

  it('resumes a suspended context before playing a cue', async () => {
    const audio = installAudioMock('suspended');
    const { playAtlasSound } = await import('./atlasAudio');

    playAtlasSound('correct-location');

    await vi.waitFor(() => expect(audio.context.createOscillator).toHaveBeenCalledTimes(2));
    expect(audio.context.resume).toHaveBeenCalledOnce();
    expect(audio.oscillators.every((oscillator) => oscillator.start.mock.calls.length === 1)).toBe(
      true,
    );
  });

  it('silently skips a cue when autoplay resume is rejected', async () => {
    const audio = installAudioMock('suspended');
    audio.context.resume.mockRejectedValue(new Error('Playback was not allowed'));
    const { playAtlasSound } = await import('./atlasAudio');

    expect(() => playAtlasSound('round-transition')).not.toThrow();

    await vi.waitFor(() => expect(audio.context.resume).toHaveBeenCalledOnce());
    expect(audio.context.createOscillator).not.toHaveBeenCalled();
  });

  it('uses a longer celebratory phrase for an expedition completion', async () => {
    const audio = installAudioMock();
    const { playAtlasSound } = await import('./atlasAudio');

    playAtlasSound('expedition-complete', { intensity: 0.8 });

    await vi.waitFor(() => expect(audio.context.createOscillator).toHaveBeenCalledTimes(4));
    const frequencies = audio.oscillators.map(
      (oscillator) => oscillator.frequency.setValueAtTime.mock.calls[0]?.[0],
    );
    expect(frequencies).toEqual([261.63, 329.63, 392, 523.25]);
  });

  it('does not create an audio context for a muted cue', async () => {
    const constructor = vi.fn();
    const localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };
    vi.stubGlobal('window', { AudioContext: constructor, localStorage });
    const { isAtlasSoundMuted, playAtlasSound, setAtlasSoundMuted, toggleAtlasSoundMuted } =
      await import('./atlasAudio');

    expect(isAtlasSoundMuted()).toBe(false);
    setAtlasSoundMuted(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('playstead:atlas-sound-muted', 'true');
    expect(isAtlasSoundMuted()).toBe(true);

    playAtlasSound('score-reward');

    expect(constructor).not.toHaveBeenCalled();
    expect(toggleAtlasSoundMuted()).toBe(false);
  });
});
