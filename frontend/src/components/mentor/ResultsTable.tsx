'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MentorResult } from '@/types';

export function ResultsTable({ results }: { results: MentorResult[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-muted-foreground">No attempts yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Participant</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Submitted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r, i) => (
          <TableRow key={i}>
            <TableCell>{r.email ?? 'Guest'}</TableCell>
            <TableCell>{r.score}</TableCell>
            <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
