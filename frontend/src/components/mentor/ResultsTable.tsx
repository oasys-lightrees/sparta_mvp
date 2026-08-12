'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { MentorResult } from '@/types';

export function ResultsTable({ results }: { results: MentorResult[] }) {
  const { t } = useLanguage();
  if (results.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('results.empty')}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('results.participant')}</TableHead>
          <TableHead>{t('results.score')}</TableHead>
          <TableHead>{t('results.submitted')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r, i) => (
          <TableRow key={i}>
            <TableCell>{r.email ?? t('results.guest')}</TableCell>
            <TableCell>{r.score}</TableCell>
            <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
