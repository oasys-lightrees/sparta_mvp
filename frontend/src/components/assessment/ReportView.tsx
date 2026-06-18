import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AttemptReport } from '@/types';

export function ReportView({ data }: { data: AttemptReport }) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>Your Result</CardTitle>
          <Badge variant="secondary">{data.report.type}</Badge>
        </div>
        <div className="rounded-lg bg-muted/60 p-6 text-center">
          <p className="text-sm text-muted-foreground">Your score</p>
          <p className="mt-1 text-5xl font-bold tracking-tight">{data.score}</p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm leading-relaxed">
          {data.report.content}
        </p>
      </CardContent>
    </Card>
  );
}
