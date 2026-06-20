import { Award, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AttemptReport } from '@/types';

const LEVEL_STYLES: Record<string, string> = {
  Beginner: 'bg-amber-100 text-amber-800',
  Intermediate: 'bg-sky-100 text-sky-800',
  Advanced: 'bg-emerald-100 text-emerald-800',
  Completed: 'bg-secondary text-secondary-foreground',
};

export function ReportView({ data }: { data: AttemptReport }) {
  const levelClass = LEVEL_STYLES[data.level] ?? LEVEL_STYLES.Completed;

  return (
    <Card className="overflow-hidden">
      {/* Score hero */}
      <div className="relative bg-gradient-to-br from-primary to-indigo-700 px-6 py-8 text-primary-foreground">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="bg-white/15 text-primary-foreground hover:bg-white/15"
          >
            {data.report.type} REPORT
          </Badge>
          <Award className="h-5 w-5 opacity-80" />
        </div>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-primary-foreground/70">
              {data.assessment_title ?? 'Your result'}
            </p>
            <p className="mt-1 text-6xl font-bold leading-none tracking-tight">
              {data.score}
            </p>
            <p className="mt-1 text-sm text-primary-foreground/70">
              Total score
            </p>
          </div>
          <span
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-semibold',
              levelClass,
            )}
          >
            {data.level}
          </span>
        </div>
      </div>

      {/* Summary */}
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Summary
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
          {data.report.content}
        </p>
      </CardContent>
    </Card>
  );
}
