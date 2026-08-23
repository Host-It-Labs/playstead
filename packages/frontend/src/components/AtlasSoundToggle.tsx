import { useState } from 'react';
import { FiVolume2, FiVolumeX } from 'react-icons/fi';
import { isAtlasSoundMuted, playAtlasSound, toggleAtlasSoundMuted } from '../lib/atlasAudio';

export function AtlasSoundToggle() {
  const [muted, setMuted] = useState(isAtlasSoundMuted);
  const label = muted ? 'Turn game sounds on' : 'Mute game sounds';

  const toggle = () => {
    const nextMuted = toggleAtlasSoundMuted();
    setMuted(nextMuted);
    if (!nextMuted) playAtlasSound('round-transition', { intensity: 0.45 });
  };

  return (
    <button
      className="sound-toggle"
      type="button"
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      {muted ? <FiVolumeX aria-hidden="true" /> : <FiVolume2 aria-hidden="true" />}
    </button>
  );
}
