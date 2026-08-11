'use client';

import { useEffect, useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { balanceApi } from '@/services/balance.api';
import { formatIdr } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { cn } from '@/lib/utils';
import type { BalancePricing } from '@/types';

// Preset top-up amounts in IDR (whole rupiah).
const PRESETS = [25_000, 50_000, 100_000, 250_000];
const MIN_AMOUNT = 1_000;
const MAX_AMOUNT = 10_000_000;

/**
 * Wallet top-up dialog: pick a rupiah amount (presets or custom) and start the
 * top-up. The amount entered is exactly what's charged and credited (1:1). The
 * parent owns the actual top-up (Midtrans redirect / demo credit) via onConfirm.
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
  const [amount, setAmount] = useState<number>(PRESETS[0]);
  const [custom, setCustom] = useState('');
  const [pricing, setPricing] = useState<BalancePricing | null>(null);
  const [localError, setLocalError] = useState('');

  // Load pricing whenever the dialog opens; reset selection.
  useEffect(() => {
    if (!open) return;
    setAmount(PRESETS[0]);
    setCustom('');
    setLocalError('');
    let active = true;
    balanceApi
      .getPricing()
      .then((p) => active && setPricing(p))
      .catch(() => {
        /* pricing is best-effort; the amount picker still works */
      });
    return () => {
      active = false;
    };
  }, [open]);

  // Close on Escape (unless a top-up is in flight).
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

  const valid =
    Number.isInteger(amount) && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;

  const confirm = () => {
    if (!valid) {
      setLocalError(
        `Enter an amount between ${formatIdr(MIN_AMOUNT)} and ${formatIdr(MAX_AMOUNT)}.`,
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
            <Wallet className="h-5 w-5 text-bronze" />
            <h2 id="topup-title" className="text-lg font-semibold">
              Top up balance
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
          Your balance unlocks paid assessments and voucher packages. Choose an
          amount:
        </p>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((n) => (
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
              {formatIdr(n)}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="topup-custom">Or a custom amount (Rp)</Label>
          <Input
            id="topup-custom"
            type="number"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step={1000}
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            placeholder="e.g. 75000"
          />
        </div>

        {/* Charge summary */}
        <div className="mt-4 flex items-center justify-between rounded-md border bg-accent/20 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">You&apos;ll add</span>
          <span className="font-semibold">
            {pricing === null
              ? '…'
              : pricing.payment_configured
                ? formatIdr(amount)
                : `${formatIdr(amount)} · Instant demo credit`}
          </span>
        </div>
        {pricing && !pricing.payment_configured ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Demo mode: no payment gateway is configured, so your balance is
            credited instantly at no charge.
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
              : pricing?.payment_configured
                ? `Pay ${formatIdr(amount)}`
                : `Add ${formatIdr(amount)}`}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
