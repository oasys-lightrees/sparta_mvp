'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AssessmentImage } from '@/components/assessment/AssessmentImage';
import { ShieldMark } from '@/components/brand/ShieldMark';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { AssessmentSummary } from '@/types';

export function AssessmentCard({
  assessment,
}: {
  assessment: AssessmentSummary;
}) {
  const { t } = useLanguage();
  const isPaid = assessment.price > 0;

  return (
    <Card className="group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Image banner — a challenge to take on */}
      <div className="relative">
        <AssessmentImage src={assessment.imageUrl} alt={assessment.title} />
        <span className="absolute right-3 top-3">
          {isPaid ? (
            <Badge variant="bronze" className="shadow-sm">
              ${assessment.price}
            </Badge>
          ) : (
            <Badge variant="secondary" className="shadow-sm">
              {t('assessment.free')}
            </Badge>
          )}
        </span>
      </div>
      <CardHeader>
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
          <ShieldMark className="h-3.5 w-3.5" withGlyph={false} />
          {t('assessment.challengeTag')}
        </div>
        <CardTitle className="text-xl leading-snug">
          {assessment.title}
        </CardTitle>
        {assessment.description ? (
          <CardDescription className="line-clamp-3">
            {assessment.description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1" />
      <CardFooter>
        <Button asChild variant="bronze" className="w-full">
          <Link href={`/assessments/${assessment.id}`}>
            {t('assessment.start')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
