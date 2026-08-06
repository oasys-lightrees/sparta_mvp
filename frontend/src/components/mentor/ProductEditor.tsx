'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { productApi } from '@/services/product.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ImageSourceField } from '@/components/mentor/ImageSourceField';
import type {
  MentorProduct,
  PricingTier,
  ProductStatus,
  ProductTierKind,
} from '@/types';

const KIND_OPTIONS: { value: ProductTierKind; label: string }[] = [
  { value: 'FREE', label: 'Free' },
  { value: 'FREEMIUM', label: 'Freemium (free + premium upsell)' },
  { value: 'PAID', label: 'Paid (tokens)' },
  { value: 'VOUCHER', label: 'Voucher (redeem a code)' },
];

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tier-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const makeTier = (over: Partial<PricingTier> = {}): PricingTier => ({
  id: newId(),
  enabled: true,
  title: 'New tier',
  description: '',
  kind: 'FREE',
  priceLabel: '',
  tokenCost: 0,
  ctaLabel: 'Get started',
  imageUrl: null,
  highlight: false,
  ...over,
});

const DEFAULT_TIERS = (): PricingTier[] => [
  makeTier({
    id: 'basic',
    title: 'Basic',
    description: 'Take the assessment and get your instant report.',
    kind: 'FREE',
    priceLabel: 'Free',
    ctaLabel: 'Start assessment',
  }),
  makeTier({
    id: 'premium',
    title: 'Premium',
    description: 'Unlock the full personalized AI report.',
    kind: 'FREEMIUM',
    ctaLabel: 'Get premium',
    highlight: true,
  }),
  makeTier({
    id: 'voucher',
    title: 'Team / Voucher',
    description: 'Have a company voucher? Redeem it to unlock access.',
    kind: 'VOUCHER',
    ctaLabel: 'Redeem a voucher',
  }),
];

// Guard against any legacy/empty shape — always work with an array.
const normalizeTiers = (tiers: unknown): PricingTier[] =>
  Array.isArray(tiers) && tiers.length > 0 ? (tiers as PricingTier[]) : DEFAULT_TIERS();

type Form = {
  name: string;
  description: string;
  status: ProductStatus;
  tiers: PricingTier[];
};

const fromProduct = (p: MentorProduct): Form => ({
  name: p.name,
  description: p.description ?? '',
  status: p.status,
  tiers: normalizeTiers(p.tiers),
});

/**
 * Mentor editor for an assessment's product — a list of pricing tiers, each a
 * marketing card (title, description, price, token cost, button, image) with a
 * pricing kind (free / freemium / paid / voucher) that decides where its button
 * routes on the landing page. Purchase mechanics still reuse the assessment's
 * access model and voucher flow; this configures the presentation.
 */
export function ProductEditor({
  assessmentId,
  assessmentTitle,
}: {
  assessmentId: string;
  assessmentTitle: string;
}) {
  const [product, setProduct] = useState<MentorProduct | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    productApi
      .getMine(assessmentId)
      .then((p) => {
        if (!active) return;
        setProduct(p);
        setLoaded(true);
      })
      .catch((e) => {
        if (active) setLoadError(e instanceof Error ? e.message : 'Failed to load product');
      });
    return () => {
      active = false;
    };
  }, [assessmentId]);

  const startEdit = () => {
    setForm(
      product
        ? fromProduct(product)
        : {
            name: assessmentTitle,
            description: '',
            status: 'DRAFT',
            tiers: DEFAULT_TIERS(),
          },
    );
    setSaveError('');
    setEditing(true);
  };

  const setTier = (index: number, patch: Partial<PricingTier>) =>
    setForm((f) =>
      f
        ? { ...f, tiers: f.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)) }
        : f,
    );

  const addTier = () =>
    setForm((f) => (f && f.tiers.length < 6 ? { ...f, tiers: [...f.tiers, makeTier()] } : f));

  const removeTier = (index: number) =>
    setForm((f) => (f ? { ...f, tiers: f.tiers.filter((_, i) => i !== index) } : f));

  const persist = async (payload: {
    name: string;
    description: string | null;
    status: ProductStatus;
    tiers: PricingTier[];
  }) => {
    const saved = await productApi.upsert(assessmentId, payload);
    setProduct(saved);
    return saved;
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      const saved = await persist({
        name: form.name.trim() || assessmentTitle,
        description: form.description.trim() === '' ? null : form.description.trim(),
        status: form.status,
        tiers: form.tiers,
      });
      setForm(fromProduct(saved));
      setEditing(false);
      setNotice(
        saved.status === 'PUBLISHED'
          ? 'Product saved and published — its tiers are live on the landing page.'
          : 'Product saved as a draft.',
      );
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    if (!product) return;
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      const next: ProductStatus = product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      await persist({
        name: product.name,
        description: product.description,
        status: next,
        tiers: normalizeTiers(product.tiers),
      });
      setNotice(next === 'PUBLISHED' ? 'Product published.' : 'Product unpublished.');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Product &amp; pricing</CardTitle>
          <CardDescription>
            Package this assessment into pricing tiers — each a card with its own
            title, price, token cost, button and image, and a pricing type (free,
            freemium, paid, or voucher).
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          {loaded && product && !editing ? (
            <>
              <Button variant="outline" size="sm" onClick={togglePublish} disabled={saving}>
                {product.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
              </Button>
              <Button size="sm" onClick={startEdit} disabled={saving}>
                Customize
              </Button>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError ? <ErrorMessage message={loadError} /> : null}
        {notice ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}

        {!loaded && !loadError ? <Loading /> : null}

        {loaded && !product && !editing ? (
          <div className="flex items-center justify-between gap-4 rounded-md border border-dashed bg-accent/20 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              No product yet. Set one up to show pricing tiers on this assessment&apos;s
              landing page.
            </p>
            <Button size="sm" onClick={startEdit}>
              Set up product
            </Button>
          </div>
        ) : null}

        {loaded && product && !editing ? (
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-medium">{product.name}</span>
              <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
                {product.status}
              </span>
            </div>
            <p className="text-muted-foreground">
              {normalizeTiers(product.tiers)
                .filter((t) => t.enabled)
                .map((t) => t.title || t.kind)
                .join(' · ') || 'No tiers enabled'}
            </p>
          </div>
        ) : null}

        {editing && form ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Product name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  placeholder={assessmentTitle}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  className={selectClass}
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, status: e.target.value as ProductStatus } : f))
                  }
                >
                  <option value="DRAFT">Draft (hidden)</option>
                  <option value="PUBLISHED">Published (live on landing)</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, description: e.target.value } : f))
                }
                placeholder="Short summary shown above the tiers."
              />
            </div>

            {/* Tiers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pricing tiers
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTier}
                  disabled={form.tiers.length >= 6}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add tier
                </Button>
              </div>
              <p className="rounded-md border border-dashed bg-accent/20 px-3 py-2 text-xs text-muted-foreground">
                Token prices are charged for real. Saving sets this assessment&apos;s
                access from the tiers: a <strong>Freemium</strong> tier&apos;s tokens
                become the premium-report cost, a <strong>Paid</strong> tier&apos;s
                tokens the start-access cost, and a <strong>Voucher</strong> tier makes
                the assessment voucher-gated.
              </p>

              {form.tiers.map((tier, i) => (
                <div key={tier.id} className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={tier.enabled}
                          onChange={(e) => setTier(i, { enabled: e.target.checked })}
                        />
                        Enabled
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={tier.highlight}
                          onChange={(e) => setTier(i, { highlight: e.target.checked })}
                        />
                        Highlight
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTier(i)}
                      aria-label="Remove tier"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Title</Label>
                      <Input
                        value={tier.title}
                        onChange={(e) => setTier(i, { title: e.target.value })}
                        placeholder="e.g. Premium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pricing type</Label>
                      <select
                        className={selectClass}
                        value={tier.kind}
                        onChange={(e) => setTier(i, { kind: e.target.value as ProductTierKind })}
                      >
                        {KIND_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Price label</Label>
                      <Input
                        value={tier.priceLabel}
                        onChange={(e) => setTier(i, { priceLabel: e.target.value })}
                        placeholder="e.g. $29 or Free"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Token price (0 = hide)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={tier.tokenCost}
                        onChange={(e) =>
                          setTier(i, { tokenCost: Math.max(0, Number(e.target.value) || 0) })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input
                      value={tier.description}
                      onChange={(e) => setTier(i, { description: e.target.value })}
                      placeholder="One line describing this tier."
                    />
                  </div>

                  {/* Image shown between the title and the button on the card. */}
                  <ImageSourceField
                    label="Tier image / logo (optional)"
                    value={tier.imageUrl ?? ''}
                    onChange={(v) => setTier(i, { imageUrl: v.trim() === '' ? null : v.trim() })}
                    helpText="Shown between the title and the button. PNG, SVG, JPG, JPEG or WEBP · up to 5 MB."
                  />

                  <div className="space-y-1.5">
                    <Label>Button label</Label>
                    <Input
                      value={tier.ctaLabel}
                      onChange={(e) => setTier(i, { ctaLabel: e.target.value })}
                      placeholder="e.g. Get started"
                    />
                  </div>
                </div>
              ))}

              {form.tiers.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  No tiers. Add at least one to show pricing on the landing page.
                </p>
              ) : null}
            </div>

            <ErrorMessage message={saveError} />

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save product'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setSaveError('');
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
