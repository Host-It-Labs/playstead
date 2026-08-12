import clsx from 'clsx';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { FiAlertCircle, FiLoader } from 'react-icons/fi';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

export function Button({
  className,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx('button', `button--${variant}`, `button--${size}`, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <FiLoader className="spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, id, className, ...props }: FieldProps) {
  const resolvedId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <label className="field" htmlFor={resolvedId}>
      <span className="field__label">{label}</span>
      <input id={resolvedId} className={clsx('input', className)} {...props} />
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Card({
  children,
  className,
  as: Component = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'article' | 'section' | 'div';
}) {
  return <Component className={clsx('card', className)}>{children}</Component>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'live' | 'coral' | 'success';
}) {
  return <span className={clsx('pill', `pill--${tone}`)}>{children}</span>;
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="error-banner" role="alert">
      <FiAlertCircle aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function LoadingState({ label = 'Setting the table…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-state__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__sun" aria-hidden="true" />
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}

type Segment<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  label,
  value,
  segments,
  onChange,
}: {
  label: string;
  value: T;
  segments: Segment<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {segments.map((segment) => (
        <button
          className={clsx('segmented__button', value === segment.value && 'is-active')}
          key={segment.value}
          type="button"
          aria-pressed={value === segment.value}
          onClick={() => onChange(segment.value)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}
