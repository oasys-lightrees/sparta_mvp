'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PublicQuestion } from '@/types';

type Props = {
  question: PublicQuestion;
  index: number;
  total: number;
  selectedChoiceId?: string;
  onSelect: (choiceId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  submitting: boolean;
  onSubmit: () => void;
};

export function QuestionStep({
  question,
  index,
  total,
  selectedChoiceId,
  onSelect,
  onPrev,
  onNext,
  isFirst,
  isLast,
  submitting,
  onSubmit,
}: Props) {
  const progress = Math.round(((index + 1) / total) * 100);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-medium">
              Question {index + 1} of {total}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <CardTitle className="text-xl leading-snug">
          {question.question}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {question.choices.map((choice) => {
          const isSelected = choice.id === selectedChoiceId;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onSelect(choice.id)}
              aria-pressed={isSelected}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-foreground/20 hover:bg-accent',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  isSelected ? 'border-primary' : 'border-muted-foreground/40',
                )}
              >
                {isSelected ? (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                ) : null}
              </span>
              {choice.text}
            </button>
          );
        })}
      </CardContent>
      <CardFooter className="justify-between gap-2">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={isFirst || submitting}
        >
          Previous
        </Button>
        {isLast ? (
          <Button onClick={onSubmit} disabled={!selectedChoiceId || submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        ) : (
          <Button onClick={onNext} disabled={!selectedChoiceId}>
            Next
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
