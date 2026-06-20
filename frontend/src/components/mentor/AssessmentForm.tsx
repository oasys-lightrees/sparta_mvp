'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { AssessmentImage } from '@/components/assessment/AssessmentImage';
import type { ResultCategories } from '@/types';

export type AssessmentPayload = {
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
  low_score_threshold: number | null;
  high_score_threshold: number | null;
  free_report_text: string | null;
  premium_token_cost: number;
  free_report_template: string | null;
  premium_report_description: string | null;
  email_template: string | null;
  base_knowledge: string | null;
  ai_enabled: boolean;
  result_categories: ResultCategories | null;
};

// Result-category editor rows (diagnostic/personality assessments). Codes are
// mentor-defined (e.g. PB, PO, GR) — not limited to A/B/C/D.
type CategoryRow = { code: string; name: string; knowledge: string };

type Props = {
  initial?: Partial<{
    title: string;
    description: string | null;
    image_url: string | null;
    price: number;
    low_score_threshold: number | null;
    high_score_threshold: number | null;
    free_report_text: string | null;
    premium_token_cost: number;
    free_report_template: string | null;
    premium_report_description: string | null;
    email_template: string | null;
    base_knowledge: string | null;
    ai_enabled: boolean;
    result_categories: ResultCategories | null;
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
  const [imageUrl, setImageUrl] = useState(str(initial?.image_url));
  const [price, setPrice] = useState(numStr(initial?.price));
  const [premiumCost, setPremiumCost] = useState(
    numStr(initial?.premium_token_cost),
  );
  const [low, setLow] = useState(numStr(initial?.low_score_threshold));
  const [high, setHigh] = useState(numStr(initial?.high_score_threshold));
  const [freeText, setFreeText] = useState(str(initial?.free_report_text));
  const [freeTemplate, setFreeTemplate] = useState(
    str(initial?.free_report_template),
  );
  const [premiumDesc, setPremiumDesc] = useState(
    str(initial?.premium_report_description),
  );
  const [emailTemplate, setEmailTemplate] = useState(
    str(initial?.email_template),
  );
  const [baseKnowledge, setBaseKnowledge] = useState(
    str(initial?.base_knowledge),
  );
  const [aiEnabled, setAiEnabled] = useState(Boolean(initial?.ai_enabled));
  const [categories, setCategories] = useState<CategoryRow[]>(() => {
    const rc = initial?.result_categories;
    if (rc && Object.keys(rc).length > 0) {
      return Object.entries(rc).map(([code, c]) => ({
        code,
        name: c.name,
        knowledge: c.knowledge,
      }));
    }
    return [];
  });
  const [localError, setLocalError] = useState('');

  const setCategory = (i: number, patch: Partial<CategoryRow>) =>
    setCategories((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );
  const addCategory = () =>
    setCategories((prev) => [...prev, { code: '', name: '', knowledge: '' }]);
  const removeCategory = (i: number) =>
    setCategories((prev) => prev.filter((_, idx) => idx !== i));

  // Build the result_categories map keyed by code. Null when no category has a
  // code+name (-> exam-style assessment).
  const buildResultCategories = (): ResultCategories | null => {
    const out: ResultCategories = {};
    for (const c of categories) {
      const code = c.code.trim();
      if (code !== '' && c.name.trim() !== '') {
        out[code] = { name: c.name.trim(), knowledge: c.knowledge.trim() };
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  };

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
      image_url: imageUrl.trim() === '' ? null : imageUrl.trim(),
      price: price.trim() === '' ? 0 : Number(price),
      low_score_threshold: lowNum,
      high_score_threshold: highNum,
      free_report_text: freeText.trim() === '' ? null : freeText,
      premium_token_cost: premiumCost.trim() === '' ? 0 : Number(premiumCost),
      free_report_template: freeTemplate.trim() === '' ? null : freeTemplate,
      premium_report_description:
        premiumDesc.trim() === '' ? null : premiumDesc,
      email_template: emailTemplate.trim() === '' ? null : emailTemplate,
      base_knowledge: baseKnowledge.trim() === '' ? null : baseKnowledge,
      ai_enabled: aiEnabled,
      result_categories: buildResultCategories(),
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
      <div className="space-y-2">
        <Label htmlFor="image_url">Cover image URL</Label>
        <div className="flex gap-2">
          <Input
            id="image_url"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          {imageUrl.trim() !== '' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setImageUrl('')}
            >
              Remove
            </Button>
          ) : null}
        </div>
        {imageUrl.trim() !== '' ? (
          <div className="max-w-xs overflow-hidden rounded-md border">
            <AssessmentImage src={imageUrl.trim()} alt={title || 'Cover preview'} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Optional. Paste an image URL to give your assessment a cover.
          </p>
        )}
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
          placeholder="Intro shown above the score band (legacy fallback)"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="free_report_template">Free report template</Label>
        <Textarea
          id="free_report_template"
          value={freeTemplate}
          onChange={(e) => setFreeTemplate(e.target.value)}
          className="min-h-[120px] font-mono text-xs"
          placeholder={
            'Variables: {{assessment_title}}, {{score}}, {{category}}, {{summary}}'
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="premium_report_description">
          Premium report description
        </Label>
        <Textarea
          id="premium_report_description"
          value={premiumDesc}
          onChange={(e) => setPremiumDesc(e.target.value)}
          placeholder="What the premium report includes (shown to users)"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email_template">Email template</Label>
        <Textarea
          id="email_template"
          value={emailTemplate}
          onChange={(e) => setEmailTemplate(e.target.value)}
          className="min-h-[120px] font-mono text-xs"
          placeholder={
            'Optional. Variables: {{assessment_title}}, {{score}}, {{category}}, {{summary}}, {{free_report}}'
          }
        />
      </div>

      <div className="space-y-2 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <Label>AI assistant</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={aiEnabled ? 'default' : 'outline'}
              onClick={() => setAiEnabled(true)}
            >
              On
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!aiEnabled ? 'default' : 'outline'}
              onClick={() => setAiEnabled(false)}
            >
              Off
            </Button>
          </div>
        </div>
        <Label htmlFor="base_knowledge">Base knowledge</Label>
        <Textarea
          id="base_knowledge"
          value={baseKnowledge}
          onChange={(e) => setBaseKnowledge(e.target.value)}
          placeholder="e.g. High score means advanced leadership. Low score means needs communication improvement."
        />
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="space-y-1">
          <Label>Result categories (diagnostic / personality)</Label>
          <p className="text-xs text-muted-foreground">
            Optional. Define result types with a short code (e.g. PB, PO), a name
            and knowledge. When set, results are based on each answer&apos;s
            category mapping instead of a score. Leave empty for an exam-style
            assessment.
          </p>
        </div>
        {categories.map((c, i) => (
          <div key={i} className="space-y-2 rounded-md border p-3">
            <div className="flex gap-2">
              <Input
                value={c.code}
                onChange={(e) => setCategory(i, { code: e.target.value })}
                placeholder="Code (e.g. PB)"
                className="w-32"
                aria-label="Category code"
              />
              <Input
                value={c.name}
                onChange={(e) => setCategory(i, { name: e.target.value })}
                placeholder="Name (e.g. Power Builder)"
                className="flex-1"
                aria-label="Category name"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeCategory(i)}
              >
                Remove
              </Button>
            </div>
            <Textarea
              value={c.knowledge}
              onChange={(e) => setCategory(i, { knowledge: e.target.value })}
              placeholder="Knowledge — what people with this result are like"
            />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addCategory}>
          + Add Category
        </Button>
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
