'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { AssessmentImage } from '@/components/assessment/AssessmentImage';
import {
  LearningResourcesEditor,
  type ResourceProfile,
} from '@/components/mentor/LearningResourcesEditor';
import { cn } from '@/lib/utils';
import type { AccessMode, LearningResourcesDoc, ResultCategories } from '@/types';

type AssessmentMode = 'SKILL' | 'PERSONALITY';

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
  study_video_url: string | null;
  learning_resources: LearningResourcesDoc | null;
  access_mode: AccessMode;
  access_token_cost: number;
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
    study_video_url: string | null;
    learning_resources: LearningResourcesDoc | null;
    access_mode: AccessMode | null;
    access_token_cost: number;
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
  const [studyVideoUrl, setStudyVideoUrl] = useState(
    str(initial?.study_video_url),
  );
  const [resourcesDoc, setResourcesDoc] = useState<LearningResourcesDoc | null>(
    initial?.learning_resources ?? null,
  );
  const [accessMode, setAccessMode] = useState<AccessMode>(
    initial?.access_mode ?? 'FREEMIUM',
  );
  const [accessTokenCost, setAccessTokenCost] = useState(
    numStr(initial?.access_token_cost),
  );
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
  // Mode is derived from whether the assessment has result categories. UI-only
  // state: it decides which fields are shown, not the data shape.
  const [mode, setMode] = useState<AssessmentMode>(() =>
    initial?.result_categories &&
    Object.keys(initial.result_categories).length > 0
      ? 'PERSONALITY'
      : 'SKILL',
  );
  const isPersonality = mode === 'PERSONALITY';
  const [localError, setLocalError] = useState('');

  const selectMode = (next: AssessmentMode) => {
    setMode(next);
    // Seed one empty category row so the editor is ready in personality mode.
    if (next === 'PERSONALITY' && categories.length === 0) {
      setCategories([{ code: '', name: '', knowledge: '' }]);
    }
  };

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
    // Thresholds only apply to skill mode.
    const lowNum = isPersonality ? null : toNum(low);
    const highNum = isPersonality ? null : toNum(high);
    if (lowNum !== null && highNum !== null && lowNum > highNum) {
      setLocalError('Low score threshold must be <= high score threshold');
      return;
    }
    const accessCost = accessTokenCost.trim() === '' ? 0 : Number(accessTokenCost);
    if (accessMode === 'PAID' && accessCost <= 0) {
      setLocalError('PAID assessments need a positive access cost (tokens)');
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim() === '' ? null : description,
      image_url: imageUrl.trim() === '' ? null : imageUrl.trim(),
      // Price is no longer edited in the form; preserve any existing value.
      price: initial?.price ?? 0,
      low_score_threshold: lowNum,
      high_score_threshold: highNum,
      free_report_text: freeText.trim() === '' ? null : freeText,
      // Premium report cost only applies to Freemium; force 0 for other modes.
      premium_token_cost:
        accessMode === 'FREEMIUM'
          ? premiumCost.trim() === ''
            ? 0
            : Number(premiumCost)
          : 0,
      // Score template is a skill-mode field.
      free_report_template:
        isPersonality || freeTemplate.trim() === '' ? null : freeTemplate,
      premium_report_description:
        premiumDesc.trim() === '' ? null : premiumDesc,
      email_template: emailTemplate.trim() === '' ? null : emailTemplate,
      base_knowledge: baseKnowledge.trim() === '' ? null : baseKnowledge,
      ai_enabled: aiEnabled,
      // Categories only apply to personality mode.
      result_categories: isPersonality ? buildResultCategories() : null,
      study_video_url:
        studyVideoUrl.trim() === '' ? null : studyVideoUrl.trim(),
      learning_resources: resourcesDoc,
      access_mode: accessMode,
      // Access cost only applies to PAID; force 0 otherwise so it's never stale.
      access_token_cost: accessMode === 'PAID' ? accessCost : 0,
    });
  };

  // Result profiles a resource can target: personality categories, or the score
  // levels for skill assessments.
  const resourceProfiles: ResourceProfile[] = isPersonality
    ? categories
        .filter((c) => c.code.trim() !== '')
        .map((c) => ({
          code: c.code.trim(),
          label: c.name.trim() || c.code.trim(),
        }))
    : [
        { code: 'Beginner', label: 'Beginner' },
        { code: 'Intermediate', label: 'Intermediate' },
        { code: 'Advanced', label: 'Advanced' },
        { code: 'Completed', label: 'Completed (no thresholds)' },
      ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Assessment Type</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: 'SKILL' as const,
                title: 'Skill Assessment',
                description:
                  'Evaluate knowledge with correct answers and scoring.',
              },
              {
                value: 'PERSONALITY' as const,
                title: 'Personality Assessment',
                description: 'Categorize users based on answer patterns.',
              },
            ]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectMode(opt.value)}
              aria-pressed={mode === opt.value}
              className={cn(
                'rounded-md border p-3 text-left transition-colors',
                mode === opt.value
                  ? 'border-primary bg-accent/40 ring-1 ring-primary'
                  : 'hover:bg-accent/30',
              )}
            >
              <span className="block text-sm font-medium">{opt.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      </div>
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
      {/* Access model — how takers get to start this assessment. Any cost the
          mode needs (premium unlock for Freemium, access cost for Paid) is set
          inside the card, so mentors only see the field relevant to their mode. */}
      <div className="space-y-3 rounded-md border p-4">
        <div className="space-y-1">
          <Label>Access model</Label>
          <p className="text-xs text-muted-foreground">
            Controls who can start this assessment. Premium reports remain a
            separate token unlock only in Freemium.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { value: 'FREE', title: 'Free', description: 'Anyone can start immediately. No premium tier.' },
              { value: 'FREEMIUM', title: 'Freemium', description: 'Free to take; premium report unlockable with tokens.' },
              { value: 'PAID', title: 'Paid', description: 'Must buy access (tokens) before starting. Full result included.' },
              { value: 'VOUCHER', title: 'Voucher', description: 'Must redeem a valid voucher before starting.' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAccessMode(opt.value)}
              aria-pressed={accessMode === opt.value}
              className={cn(
                'rounded-md border p-3 text-left transition-colors',
                accessMode === opt.value
                  ? 'border-primary bg-accent/40 ring-1 ring-primary'
                  : 'hover:bg-accent/30',
              )}
            >
              <span className="block text-sm font-medium">{opt.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {opt.description}
              </span>
            </button>
          ))}
        </div>
        {accessMode === 'FREEMIUM' ? (
          <div className="space-y-2">
            <Label htmlFor="premium_token_cost">Premium report cost (tokens)</Label>
            <Input
              id="premium_token_cost"
              type="number"
              min={0}
              value={premiumCost}
              onChange={(e) => setPremiumCost(e.target.value)}
              placeholder="e.g. 40"
            />
            <p className="text-xs text-muted-foreground">
              Tokens a taker spends to unlock the premium report after taking the
              assessment for free. 0 means no premium report is offered.
            </p>
          </div>
        ) : null}
        {accessMode === 'PAID' ? (
          <div className="space-y-2">
            <Label htmlFor="access_token_cost">Access cost (tokens)</Label>
            <Input
              id="access_token_cost"
              type="number"
              min={1}
              value={accessTokenCost}
              onChange={(e) => setAccessTokenCost(e.target.value)}
              placeholder="e.g. 30"
            />
            <p className="text-xs text-muted-foreground">
              Tokens a taker spends to unlock access before starting. They fund
              their wallet via payment (Midtrans) or the demo top-up, then spend
              it here. The full result is included — no separate premium unlock.
            </p>
          </div>
        ) : null}
        {accessMode === 'VOUCHER' ? (
          <div className="space-y-1 rounded-md border border-dashed bg-accent/20 p-3">
            <p className="text-xs font-medium text-foreground">
              How voucher access works
            </p>
            <p className="text-xs text-muted-foreground">
              You don&apos;t set a price here. Instead, a company buys a batch of
              seats for this assessment on the branded Company page
              (<code>/a/&lt;id&gt;/company</code>), which generates unique voucher
              codes. A taker enters a code on the Redeem page
              (<code>/a/&lt;id&gt;/redeem</code>); redeeming grants them access to
              start — one code = one seat. Publish the assessment first so those
              pages are live.
            </p>
          </div>
        ) : null}
      </div>

      {/* Score thresholds — skill mode only. */}
      {!isPersonality ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="free_report_text">
          {isPersonality ? 'Free result introduction' : 'Free report text'}
        </Label>
        <Textarea
          id="free_report_text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder={
            isPersonality
              ? 'Intro shown above the user’s result type'
              : 'Intro shown above the score band (legacy fallback)'
          }
        />
      </div>

      {/* Score-based free report template — skill mode only. */}
      {!isPersonality ? (
        <div className="space-y-2">
          <Label htmlFor="free_report_template">Free score report template</Label>
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
      ) : null}
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
        <Label htmlFor="study_video_url">Study video URL</Label>
        <Input
          id="study_video_url"
          type="url"
          value={studyVideoUrl}
          onChange={(e) => setStudyVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=…"
        />
        <p className="text-xs text-muted-foreground">
          Optional. Shown to the taker after they unlock the premium report.
          Supports YouTube, Vimeo, or a direct video link.
        </p>
      </div>

      {isPersonality ? (
      <div className="space-y-3 rounded-md border p-4">
        <div className="space-y-1">
          <Label>Personality Result Categories</Label>
          <p className="text-xs text-muted-foreground">
            Define result types with a short code (e.g. PB, PO), a name and
            knowledge. Results are based on each answer&apos;s category mapping
            (set per choice in the question editor) instead of a score.
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
      ) : null}

      <LearningResourcesEditor
        initial={initial?.learning_resources ?? null}
        profiles={resourceProfiles}
        onChange={setResourcesDoc}
      />

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
        <Label htmlFor="base_knowledge">Assessment Knowledge</Label>
        <Textarea
          id="base_knowledge"
          value={baseKnowledge}
          onChange={(e) => setBaseKnowledge(e.target.value)}
          placeholder="Explain your framework, scoring logic, and how AI should interpret results."
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
