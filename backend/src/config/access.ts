/**
 * Assessment Access Model — the single source of truth for how each assessment
 * gates *starting* and monetizes results. All access/authorization/payment logic
 * reads from the policy table below; nothing branches on the mode string
 * directly, so adding or tuning a mode is a config change, not scattered edits.
 *
 * Modes:
 *  - FREE     — anyone can start immediately; full result included.
 *  - FREEMIUM — anyone can start for free; full result included (kept as a
 *               distinct mode for backward compatibility; behaves like FREE now
 *               that the separate premium report has been removed).
 *  - PAID     — must purchase access (tokens) before starting; full result included.
 *  - VOUCHER  — must redeem a valid voucher before starting; full result included.
 *
 * Backward compatibility: existing rows default to FREEMIUM. There is no longer a
 * paid premium report, so every mode delivers the full result to anyone who can
 * start (premiumUnlockable is false everywhere).
 */

export const ACCESS_MODES = ['FREE', 'FREEMIUM', 'PAID', 'VOUCHER'] as const;
export type AccessMode = (typeof ACCESS_MODES)[number];

// Default for any assessment that predates the access model (null column) or
// omits the field — chosen to preserve the original take-free/unlock-premium UX.
export const DEFAULT_ACCESS_MODE: AccessMode = 'FREEMIUM';

export const isAccessMode = (v: unknown): v is AccessMode =>
  typeof v === 'string' && (ACCESS_MODES as readonly string[]).includes(v);

// How a start grant is obtained (null = no grant needed to start).
export type GrantVia = 'payment' | 'voucher' | null;

export type AccessPolicy = {
  // A per-user access grant is required before an attempt may be created.
  startRequiresGrant: boolean;
  // The mechanism that produces that grant.
  grantVia: GrantVia;
  // Starting requires an authenticated account (you can't pay/redeem as a guest).
  requiresAuthToStart: boolean;
  // The premium report is a separate token-unlock (freemium). When false the
  // result is fully available to anyone who could start (no premium paywall).
  premiumUnlockable: boolean;
};

// The one place mode semantics live.
export const ACCESS_POLICIES: Record<AccessMode, AccessPolicy> = {
  FREE: {
    startRequiresGrant: false,
    grantVia: null,
    requiresAuthToStart: false,
    premiumUnlockable: false,
  },
  FREEMIUM: {
    startRequiresGrant: false,
    grantVia: null,
    requiresAuthToStart: false,
    // The separate premium report has been removed — FREEMIUM now delivers the
    // full result for free, like FREE.
    premiumUnlockable: false,
  },
  PAID: {
    startRequiresGrant: true,
    grantVia: 'payment',
    requiresAuthToStart: true,
    premiumUnlockable: false,
  },
  VOUCHER: {
    startRequiresGrant: true,
    grantVia: 'voucher',
    requiresAuthToStart: true,
    premiumUnlockable: false,
  },
};

/** Resolve the policy for a (possibly null/legacy) mode value. */
export const policyFor = (mode: AccessMode | null | undefined): AccessPolicy =>
  ACCESS_POLICIES[mode ?? DEFAULT_ACCESS_MODE];

/** Normalize a mode value, falling back to the default. */
export const normalizeMode = (mode: string | null | undefined): AccessMode =>
  isAccessMode(mode) ? mode : DEFAULT_ACCESS_MODE;
