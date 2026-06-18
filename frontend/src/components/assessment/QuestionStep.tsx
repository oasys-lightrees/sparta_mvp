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
  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium text-muted-foreground">
          Question {index + 1} / {total}
        </p>
        <CardTitle className="text-xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {question.choices.map((choice) => {
          const isSelected = choice.id === selectedChoiceId;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onSelect(choice.id)}
              className={cn(
                'w-full rounded-md border px-4 py-3 text-left text-sm transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:bg-accent',
              )}
            >
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
