interface SpinnerProps {
  /** Tailwind size unit (e.g. 4 = 1rem, 5 = 1.25rem, 8 = 2rem) */
  size?: number;
  label?: string;
}

export function Spinner({ size = 5, label = "Loading…" }: SpinnerProps) {
  const dim = `${size * 0.25}rem`;
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex items-center justify-center"
      style={{ width: dim, height: dim }}
    >
      <span
        className="block rounded-full border-2 border-border border-t-accent animate-spin"
        style={{ width: dim, height: dim }}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Full-page centred loading state */
export function PageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3" role="status" aria-label={label}>
      <Spinner size={8} label={label} />
      <span className="text-xs text-ink-faint">{label}</span>
    </div>
  );
}
