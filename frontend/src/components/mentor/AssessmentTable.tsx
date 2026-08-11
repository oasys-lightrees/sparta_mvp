'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AssessmentImage } from '@/components/assessment/AssessmentImage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MentorAssessmentListItem } from '@/types';

type Props = {
  items: MentorAssessmentListItem[];
  busyId: string | null;
  onToggleStatus: (item: MentorAssessmentListItem) => void;
  onDelete: (item: MentorAssessmentListItem) => void;
};

export function AssessmentTable({
  items,
  busyId,
  onToggleStatus,
  onDelete,
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const busy = busyId === item.id;
          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-16 shrink-0 overflow-hidden rounded-md border">
                    <AssessmentImage src={item.imageUrl} alt={item.title} />
                  </div>
                  <span>{item.title}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    item.status === 'PUBLISHED' ? 'default' : 'secondary'
                  }
                >
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell>{item.totalAttempts}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/mentor/assessments/${item.id}`}>Manage</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleStatus(item)}
                    disabled={busy}
                  >
                    {item.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(item)}
                    disabled={busy}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
