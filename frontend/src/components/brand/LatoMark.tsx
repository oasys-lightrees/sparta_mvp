import { cn } from '@/lib/utils';

/**
 * LATO brand mark — a rounded badge carrying a geometric monogram "L"
 * (LighTech Assessment Tool). Minimal, modern and monochrome: it inherits
 * the surrounding text color via `currentColor`, so it works on any surface
 * and at any size (nav, footer, favicon, loading screen, PDFs).
 */
export function LatoMark({
  className,
  withGlyph = true,
}: {
  className?: string;
  withGlyph?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('h-6 w-6', className)}
    >
      <rect x="1" y="1" width="22" height="22" rx="6" className="fill-current" />
      {withGlyph ? (
        <path
          d="M8 6h2.4v9.6H16V18H8V6Z"
          className="fill-background"
        />
      ) : null}
    </svg>
  );
}
