import Link from 'next/link';
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
import type { AssessmentSummary } from '@/types';

export function AssessmentCard({
  assessment,
}: {
  assessment: AssessmentSummary;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">{assessment.title}</CardTitle>
        {assessment.description ? (
          <CardDescription className="line-clamp-3">
            {assessment.description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1">
        {assessment.price > 0 ? (
          <Badge>${assessment.price}</Badge>
        ) : (
          <Badge variant="secondary">Free</Badge>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/assessments/${assessment.id}`}>Start Assessment</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
