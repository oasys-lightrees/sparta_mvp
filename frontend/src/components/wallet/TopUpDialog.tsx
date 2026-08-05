'use client';

import { useEffect, useState } from 'react';
import { Coins, X } from 'lucide-react';
import { tokenApi } from '@/services/token.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { cn } from '@/lib/utils';
import type { TokenPricing } from '@/types';

const PACKAGES = [10, 25, 50, 100];
const MAX_TOKENS = 10000;

const formatIdr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

/**
 * Wallet top-up dialog: pick a token amount (presets or custom), see the price,
 * and start the purchase. Replaces the old window.prompt(). The parent owns the
 * actual purchase (Midtrans redirect / demo credit) via onConfirm.
 */
export function TopUpDialog({
  open,
  onClose,
  onConfirm,
  submitting,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  submitting: boolean;
  error?: string;
}) {
  const [amount, setAmount] = useState<number>(10);
  const [custom, setCustom] = useState('');
  const [pricing, setPricing] = useState<TokenPricing | null>(null);
  const [localError, setLocalError] = useState('');

  // Load pricing whenever the dialog opens; reset selection.
  useEffect(() => {
    if (!open) return;
    setAmount(10);
    setCustom('');
    setLocalError('');
    let active = true;
    tokenApi
      .getPricing()
      .then((p) => active && setPricing(p))
      .catch(() => {
        /* pricing is best-effort; the amount picker still works */
      });
    return () => {
      active = false;
    };
  }, [open]);

  // Close on Escape (unless a purchase is in flight).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const selectPreset = (n: number) => {
    setAmount(n);
    setCustom('');
    setLocalError('');
  };

  const onCustom = (raw: string) => {
    setCustom(raw);
    setLocalError('');
    const n = Number(raw);
    if (raw.trim() !== '' && Number.isInteger(n) && n > 0) setAmount(n);
  };

  const valid = Number.isInteger(amount) && amount > 0 && amount <= MAX_TOKENS;
  const total = pricing ? amount * pricing.token_price_idr : null;

  const confirm = () => {
    if (!valid) {
      setLocalError(
        `Enter a whole number of tokens between 1 and ${MAX_TOKENS}.`,
      );
      return;
    }
    onConfirm(amount);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => (!submitting ? onClose() : undefined)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-title"
        className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-bronze" />
            <h2 id="topup-title" className="text-lg font-semibold">
              Buy tokens
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-sm text-muted-foreground">
          Tokens unlock premium reports and paid assessments. Choose an amount:
        </p>

        <div className="grid grid-cols-4 gap-2">
          {PACKAGES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => selectPreset(n)}
              aria-pressed={custom === '' && amount === n}
              className={cn(
                'rounded-md border py-2 text-sm font-medium transition-colors',
                custom === '' && amount === n
                  ? 'border-primary bg-accent/40 ring-1 ring-primary'
                  : 'hover:bg-accent/30',
              )}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="topup-custom">Or a custom amount</Label>
          <Input
            id="topup-custom"
            type="number"
            min={1}
            max={MAX_TOKENS}
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            placeholder="e.g. 30"
          />
        </div>

        {/* Price summary */}
        <div className="mt-4 flex items-center justify-between rounded-md border bg-accent/20 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">
            {amount} token{amount === 1 ? '' : 's'}
          </span>
          <span className="font-semibold">
            {pricing === null
              ? '…'
              : pricing.payment_configured && total !== null
                ? formatIdr(total)
                : 'Instant demo credit'}
          </span>
        </div>
        {pricing && !pricing.payment_configured ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Demo mode: no payment gateway is configured, so tokens are credited
            instantly at no charge.
          </p>
        ) : null}

        <ErrorMessage message={localError || error || ''} />

        <div className="mt-5 flex gap-2">
          <Button
            variant="bronze"
            className="flex-1"
            onClick={confirm}
            disabled={submitting || !valid}
          >
            {submitting
              ? 'Processing…'
              : pricing?.payment_configured && total !== null
                ? `Pay ${formatIdr(total)}`
                : `Add ${amount} tokens`}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
