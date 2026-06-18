import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AttemptReport } from '@/types';

export function ReportView({ data }: { data: AttemptReport }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Your Result</CardTitle>
          <Badge variant="secondary">{data.report.type}</Badge>
        </div>
        <CardDescription>Score: {data.score}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm leading-relaxed">
          {data.report.content}
        </p>
      </CardContent>
    </Card>
  );
}
