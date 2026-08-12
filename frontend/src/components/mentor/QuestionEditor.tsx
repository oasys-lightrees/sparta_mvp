'use client';

import { useState } from 'react';
import { assessmentApi } from '@/services/assessment.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { MentorQuestion, ResultCategories } from '@/types';

type ChoiceDraft = {
  choice_text: string;
  score: string;
  categories: string[];
};
type QuestionPayload = {
  question_text: string;
  choices: { choice_text: string; score: number; categories?: string[] }[];
};

// --- Add/Edit form (multiple choice only) ---------------------------------
function QuestionForm({
  initial,
  submitLabel,
  submitting,
  categoryCodes,
  onSubmit,
  onCancel,
}: {
  initial?: { question_text: string; choices: ChoiceDraft[] };
  submitLabel: string;
  submitting: boolean;
  categoryCodes: string[];
  onSubmit: (payload: QuestionPayload) => void;
  onCancel: () => void;
}) {
  const [questionText, setQuestionText] = useState(
    initial?.question_text ?? '',
  );
  const [choices, setChoices] = useState<ChoiceDraft[]>(
    initial?.choices ?? [
      { choice_text: '', score: '0', categories: [] },
      { choice_text: '', score: '0', categories: [] },
    ],
  );
  const [error, setError] = useState('');
  const hasCategories = categoryCodes.length > 0;

  const updateChoice = (i: number, patch: Partial<ChoiceDraft>) =>
    setChoices((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const toggleCategory = (i: number, code: string) =>
    setChoices((cs) =>
      cs.map((c, idx) =>
        idx === i
          ? {
              ...c,
              categories: c.categories.includes(code)
                ? c.categories.filter((x) => x !== code)
                : [...c.categories, code],
            }
          : c,
      ),
    );
  const addChoice = () =>
    setChoices((cs) => [...cs, { choice_text: '', score: '0', categories: [] }]);
  const removeChoice = (i: number) =>
    setChoices((cs) => cs.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!questionText.trim()) {
      setError('Question text is required');
      return;
    }
    if (choices.length === 0) {
      setError('At least one choice is required');
      return;
    }
    for (const c of choices) {
      if (!c.choice_text.trim()) {
        setError('Every choice needs text');
        return;
      }
      if (!Number.isInteger(Number(c.score))) {
        setError('Every choice needs an integer score');
        return;
      }
    }
    onSubmit({
      question_text: questionText.trim(),
      choices: choices.map((c) => ({
        choice_text: c.choice_text.trim(),
        score: Number(c.score),
        categories: c.categories,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-4">
      <div className="space-y-2">
        <Label>Question text</Label>
        <Textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Choices</Label>
        {choices.map((c, i) => (
          <div key={i} className="space-y-2 rounded-md border p-2">
            <div className="flex gap-2">
              <Input
                placeholder={`Choice ${i + 1}`}
                value={c.choice_text}
                onChange={(e) =>
                  updateChoice(i, { choice_text: e.target.value })
                }
                className="flex-1"
              />
              {/* Score applies to skill assessments only; personality results
                  come from the category mapping below. */}
              {!hasCategories ? (
                <Input
                  type="number"
                  value={c.score}
                  onChange={(e) => updateChoice(i, { score: e.target.value })}
                  className="w-20"
                  aria-label="Score"
                />
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeChoice(i)}
                disabled={choices.length <= 1}
              >
                Remove
              </Button>
            </div>
            {hasCategories ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Maps to:</span>
                {categoryCodes.map((code) => {
                  const active = c.categories.includes(code);
                  return (
                    <Button
                      key={code}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className="h-7 px-2 text-xs"
                      onClick={() => toggleCategory(i, code)}
                    >
                      {code}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addChoice}>
          Add choice
        </Button>
      </div>
      <ErrorMessage message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// --- Editor ---------------------------------------------------------------
export function QuestionEditor({
  assessmentId,
  questions,
  categories,
  onChanged,
}: {
  assessmentId: string;
  questions: MentorQuestion[];
  categories?: ResultCategories | null;
  onChanged: () => void | Promise<void>;
}) {
  const categoryCodes = categories ? Object.keys(categories) : [];
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onChanged();
      setAdding(false);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Questions ({questions.length})</CardTitle>
        <div className="flex gap-2">
          {!adding ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              Add question
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ErrorMessage message={error} />

        {adding ? (
          <QuestionForm
            submitLabel="Add question"
            submitting={busy}
            categoryCodes={categoryCodes}
            onCancel={() => setAdding(false)}
            onSubmit={(payload) =>
              run(() => assessmentApi.addQuestion(assessmentId, payload))
            }
          />
        ) : null}

        {questions.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground">No questions yet.</p>
        ) : null}

        {questions.map((q) =>
          editingId === q.id ? (
            <QuestionForm
              key={q.id}
              submitLabel="Save question"
              submitting={busy}
              categoryCodes={categoryCodes}
              initial={{
                question_text: q.question_text,
                choices: q.choices.map((c) => ({
                  choice_text: c.choice_text,
                  score: String(c.score),
                  categories: c.categories ?? [],
                })),
              }}
              onCancel={() => setEditingId(null)}
              onSubmit={(payload) =>
                run(() => assessmentApi.updateQuestion(q.id, payload))
              }
            />
          ) : (
            <div key={q.id} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{q.question_text}</p>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(q.id)}
                    disabled={busy}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      run(() => assessmentApi.deleteQuestion(q.id))
                    }
                    disabled={busy}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <ul className="mt-3 space-y-1">
                {q.choices.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{c.choice_text}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {c.categories?.map((code) => (
                        <Badge key={code}>{code}</Badge>
                      ))}
                      {categoryCodes.length === 0 ? (
                        <Badge variant="secondary">score {c.score}</Badge>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </CardContent>
    </Card>
  );
}
