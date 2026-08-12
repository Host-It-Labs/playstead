import clsx from 'clsx';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={clsx('logo', compact && 'logo--compact')} aria-label="Playstead">
      <span className="logo__mark" aria-hidden="true">
        <span className="logo__hill logo__hill--back" />
        <span className="logo__hill logo__hill--front" />
        <span className="logo__pin" />
      </span>
      {compact ? null : <span className="logo__word">Playstead</span>}
    </span>
  );
}
