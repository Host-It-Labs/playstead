import { useEffect, useRef, useState } from 'react';
import { formatScore } from '../lib/format';

type AnimatedScoreProps = {
  value: number;
  prefix?: string;
  animateOnMount?: boolean;
  className?: string;
};

function reducedMotionPreferred(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function AnimatedScore({
  value,
  prefix = '',
  animateOnMount = false,
  className,
}: AnimatedScoreProps) {
  const [displayed, setDisplayed] = useState(animateOnMount ? 0 : value);
  const displayedRef = useRef(animateOnMount ? 0 : value);

  useEffect(() => {
    const from = displayedRef.current;

    if (from === value || reducedMotionPreferred()) {
      displayedRef.current = value;
      setDisplayed(value);
      return;
    }

    const startedAt = performance.now();
    const distance = Math.abs(value - from);
    const duration = Math.min(900, Math.max(420, 380 + distance * 1.2));
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(from + (value - from) * eased);
      displayedRef.current = next;
      setDisplayed(next);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={className}>
      {prefix}
      {formatScore(displayed)}
    </span>
  );
}
