import { cn } from '@/lib/utils';

/**
 * SPARTA brand mark — a clean geometric shield carrying the Greek letter
 * lambda (Λ), the historical emblem of the Spartan (Lacedaemon) shield.
 * Intentionally minimal and modern — academy crest, not a fantasy helmet.
 */
export function ShieldMark({
  className,
  withGlyph = true,
}: {
  className?: string;
  withGlyph?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 26"
      fill="none"
      aria-hidden="true"
      className={cn('h-6 w-6', className)}
    >
      <path
        d="M12 1.5 1.5 5v8.2c0 6 4.4 9.6 10.5 11.3 6.1-1.7 10.5-5.3 10.5-11.3V5L12 1.5Z"
        className="fill-current"
      />
      {withGlyph ? (
        <path
          d="M12 7.5 8 16.5h2.1L12 12l1.9 4.5H16L12 7.5Z"
          className="fill-background"
        />
      ) : null}
    </svg>
  );
}
