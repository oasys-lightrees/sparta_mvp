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
import { useLanguage } from '@/lib/i18n/LanguageProvider';
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
  const { t } = useLanguage();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('mentor.colTitle')}</TableHead>
          <TableHead>{t('mentor.colStatus')}</TableHead>
          <TableHead>{t('mentor.colAttempts')}</TableHead>
          <TableHead className="text-right">{t('mentor.colActions')}</TableHead>
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
                    <Link href={`/mentor/assessments/${item.id}`}>
                      {t('mentor.manage')}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleStatus(item)}
                    disabled={busy}
                  >
                    {item.status === 'PUBLISHED'
                      ? t('mentor.unpublish')
                      : t('mentor.publish')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(item)}
                    disabled={busy}
                  >
                    {t('mentor.delete')}
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
