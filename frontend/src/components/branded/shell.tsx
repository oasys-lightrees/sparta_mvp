import type { CSSProperties, ReactNode } from 'react';
import type { AssessmentApp } from '@/types/assessment-app';
import '@/components/landing/lato-theme.css';

/** Inject the config's 3 brand colors as CSS vars; the stylesheet derives the rest. */
export function themeVars(app: AssessmentApp): CSSProperties {
  const c = app.brand.colors;
  return {
    ['--b1' as string]: c.primary,
    ['--b2' as string]: c.secondary,
    ['--b3' as string]: c.accent,
    ['--on-b' as string]: c.onBrand,
  };
}

const ICONS: Record<string, string> = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  download: '<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
};
export function LatoIcon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? ICONS.spark }}
    />
  );
}

/** A single, consistently-styled back/exit link for the branded top bar. */
export type BrandedBack = { href: string; label: string };

/**
 * Branded app shell: the themed wrapper + a lightweight top bar. Used by every
 * branded surface (take / report / dashboard / company / redeem) so they inherit
 * the same identity and the same navigation model:
 *   - the brand mark on the left links home (pass `homeHref`);
 *   - one clear back/exit link on the right (pass `back`).
 * `right` is kept for the rare extra node; prefer `back` for navigation.
 */
export function BrandedShell({
  app,
  homeHref,
  back,
  right,
  children,
}: {
  app: AssessmentApp;
  homeHref?: string;
  back?: BrandedBack;
  right?: ReactNode;
  children: ReactNode;
}) {
  // Just the brand mark (logo/monogram); the name is intentionally omitted from
  // the top bar since the back button already provides context there.
  const brandInner = (
    <span
      className={`lato-brand__m${app.brand.logoUrl ? ' lato-brand__m--img' : ''}`}
    >
      {app.brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={app.brand.logoUrl} alt={app.brand.brandName} />
      ) : (
        app.brand.monogram
      )}
    </span>
  );

  return (
    <div
      className="lato-app"
      style={themeVars(app)}
      data-radius={app.theme.radius}
      data-spacing={app.theme.spacing}
      data-theme={app.theme.mode === 'auto' ? undefined : app.theme.mode}
    >
      <header className="lato-topbar">
        <div className="lato-topbar__in">
          {back ? (
            <a
              className="lato-back lato-back--icon"
              href={back.href}
              aria-label={back.label}
              title={back.label}
            >
              <LatoIcon name="arrowLeft" size={16} />
            </a>
          ) : null}
          {homeHref ? (
            <a
              className="lato-brand lato-brand--link"
              href={homeHref}
              aria-label={`${app.brand.brandName} home`}
            >
              {brandInner}
            </a>
          ) : (
            <span className="lato-brand">{brandInner}</span>
          )}
          {right ? <div className="lato-topbar__r">{right}</div> : null}
        </div>
      </header>
      <div className="lato-stage">{children}</div>
    </div>
  );
}
