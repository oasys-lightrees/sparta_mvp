import { cn } from '@/lib/utils';

type Accent = 'primary' | 'bronze' | 'success' | 'crimson';

const FILL: Record<Accent, string> = {
  primary: 'bg-primary',
  bronze: 'bg-bronze',
  success: 'bg-success',
  crimson: 'bg-crimson',
};

/**
 * Labeled progress/strength indicator — the "training metric" motif used in the
 * landing blueprint preview, reports and dashboards. Accessible: exposes
 * role="progressbar" with aria values.
 */
export function StrengthBar({
  label,
  value,
  accent = 'bronze',
  showValue = true,
  className,
}: {
  label: string;
  value: number; // 0–100
  accent?: Accent;
  showValue?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        {showValue ? (
          <span className="tnum font-display font-semibold tabular-nums">
            {pct}%
          </span>
        ) : null}
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full', FILL[accent])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
