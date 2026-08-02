export function Spinner({ size = 5 }: { size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full border-2 border-slate-200 border-t-accent animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}
