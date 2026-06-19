'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export type AssessmentPayload = {
  title: string;
  description: string | null;
  price: number;
  low_score_threshold: number | null;
  high_score_threshold: number | null;
  free_report_text: string | null;
  premium_token_cost: number;
};

type Props = {
  initial?: Partial<{
    title: string;
    description: string | null;
    price: number;
    low_score_threshold: number | null;
    high_score_threshold: number | null;
    free_report_text: string | null;
    premium_token_cost: number;
  }>;
  submitLabel: string;
  submitting: boolean;
  error?: string;
  onSubmit: (payload: AssessmentPayload) => void;
  onCancel?: () => void;
};

const str = (v: string | null | undefined) => (v == null ? '' : v);
const numStr = (v: number | null | undefined) => (v == null ? '' : String(v));

export function AssessmentForm({
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(str(initial?.title));
  const [description, setDescription] = useState(str(initial?.description));
  const [price, setPrice] = useState(numStr(initial?.price));
  const [premiumCost, setPremiumCost] = useState(
    numStr(initial?.premium_token_cost),
  );
  const [low, setLow] = useState(numStr(initial?.low_score_threshold));
  const [high, setHigh] = useState(numStr(initial?.high_score_threshold));
  const [freeText, setFreeText] = useState(str(initial?.free_report_text));
  const [localError, setLocalError] = useState('');

  const toNum = (s: string) => (s.trim() === '' ? null : Number(s));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!title.trim()) {
      setLocalError('Title is required');
      return;
    }
    const lowNum = toNum(low);
    const highNum = toNum(high);
    if (lowNum !== null && highNum !== null && lowNum > highNum) {
      setLocalError('Low score threshold must be <= high score threshold');
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim() === '' ? null : description,
      price: price.trim() === '' ? 0 : Number(price),
      low_score_threshold: lowNum,
      high_score_threshold: highNum,
      free_report_text: freeText.trim() === '' ? null : freeText,
      premium_token_cost: premiumCost.trim() === '' ? 0 : Number(premiumCost),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="premium_token_cost">Premium cost (tokens)</Label>
          <Input
            id="premium_token_cost"
            type="number"
            min={0}
            value={premiumCost}
            onChange={(e) => setPremiumCost(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="low">Low threshold</Label>
          <Input
            id="low"
            type="number"
            value={low}
            onChange={(e) => setLow(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="high">High threshold</Label>
          <Input
            id="high"
            type="number"
            value={high}
            onChange={(e) => setHigh(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="free_report_text">Free report text</Label>
        <Textarea
          id="free_report_text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="Intro shown above the score band in the free report"
        />
      </div>

      <ErrorMessage message={localError || error || ''} />

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
