'use client';

import { Award, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { TranslationKey } from '@/lib/i18n';
import type { AttemptReport } from '@/types';

const LEVEL_STYLES: Record<string, string> = {
  Beginner: 'bg-amber-100 text-amber-800',
  Intermediate: 'bg-sky-100 text-sky-800',
  Advanced: 'bg-emerald-100 text-emerald-800',
  Completed: 'bg-secondary text-secondary-foreground',
};

export function ReportView({ data }: { data: AttemptReport }) {
  const { t } = useLanguage();
  const levelClass = LEVEL_STYLES[data.level] ?? LEVEL_STYLES.Completed;
  // The level is a known system value; translate it, falling back to the raw
  // value for any unexpected string.
  const levelKey = `level.${data.level}` as TranslationKey;
  const levelLabel = t(levelKey) === levelKey ? data.level : t(levelKey);

  return (
    <Card className="overflow-hidden">
      {/* Score hero */}
      <div className="relative bg-gradient-to-br from-primary to-indigo-700 px-6 py-8 text-primary-foreground">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="bg-white/15 text-primary-foreground hover:bg-white/15"
          >
            {data.report.type} {t('report.reportType')}
          </Badge>
          <Award className="h-5 w-5 opacity-80" />
        </div>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-primary-foreground/70">
              {data.assessment_title ?? t('report.yourResult')}
            </p>
            <p className="mt-1 text-6xl font-bold leading-none tracking-tight">
              {data.score}
            </p>
            <p className="mt-1 text-sm text-primary-foreground/70">
              {t('report.totalScore')}
            </p>
          </div>
          <span
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-semibold',
              levelClass,
            )}
          >
            {levelLabel}
          </span>
        </div>
      </div>

      {/* Summary */}
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('report.summary')}
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
          {data.report.content}
        </p>
      </CardContent>
    </Card>
  );
}
