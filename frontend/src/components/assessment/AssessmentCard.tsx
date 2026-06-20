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
import type { AssessmentSummary } from '@/types';

export function AssessmentCard({
  assessment,
}: {
  assessment: AssessmentSummary;
}) {
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Image banner */}
      <AssessmentImage src={assessment.imageUrl} alt={assessment.title} />

      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl">{assessment.title}</CardTitle>
          {assessment.price > 0 ? (
            <Badge className="shrink-0">${assessment.price}</Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              Free
            </Badge>
          )}
        </div>
        {assessment.description ? (
          <CardDescription className="line-clamp-3">
            {assessment.description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1" />
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/assessments/${assessment.id}`}>
            Start Assessment
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
