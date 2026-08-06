'use client';

import { useEffect, useState } from 'react';
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
import type { MentorProduct, ProductStatus, ProductTiers } from '@/types';

const DEFAULT_TIERS: ProductTiers = {
  individualBasic: {
    enabled: true,
    priceLabel: 'Free',
    blurb: 'Take the assessment and get your instant report.',
  },
  individualPremium: {
    enabled: true,
    priceLabel: '',
    blurb: 'Unlock the full personalized AI report.',
  },
  companyPremium: {
    enabled: true,
    priceLabel: '',
    blurb: 'Buy seats for your team and see everyone’s results in one place.',
    seats: 10,
  },
};

type Form = {
  name: string;
  description: string;
  status: ProductStatus;
  tiers: ProductTiers;
};

const fromProduct = (p: MentorProduct): Form => ({
  name: p.name,
  description: p.description ?? '',
  status: p.status,
  tiers: p.tiers,
});

const TIER_LABELS: Record<keyof ProductTiers, string> = {
  individualBasic: 'Individual · Basic',
  individualPremium: 'Individual · Premium',
  companyPremium: 'Company · Premium',
};

/**
 * Mentor editor for an assessment's product — the sellable wrapper exposing the
 * three tiers (Individual Basic / Premium, Company Premium). Reuses the existing
 * access model + voucher flow; this just configures the pricing/packaging that
 * renders on the assessment's landing page once PUBLISHED.
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
        : { name: assessmentTitle, description: '', status: 'DRAFT', tiers: DEFAULT_TIERS },
    );
    setSaveError('');
    setEditing(true);
  };

  const setTier = <K extends keyof ProductTiers>(key: K, patch: Partial<ProductTiers[K]>) =>
    setForm((f) =>
      f ? { ...f, tiers: { ...f.tiers, [key]: { ...f.tiers[key], ...patch } } } : f,
    );

  const save = async (statusOverride?: ProductStatus) => {
    if (!form) return;
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      const saved = await productApi.upsert(assessmentId, {
        name: form.name.trim() || assessmentTitle,
        description: form.description.trim() === '' ? null : form.description.trim(),
        status: statusOverride ?? form.status,
        tiers: form.tiers,
      });
      setProduct(saved);
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

  // Publish/unpublish directly from the summary (no full edit needed).
  const togglePublish = async () => {
    if (!product) return;
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      const next: ProductStatus = product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      const saved = await productApi.upsert(assessmentId, {
        name: product.name,
        description: product.description,
        status: next,
        tiers: product.tiers,
      });
      setProduct(saved);
      setNotice(next === 'PUBLISHED' ? 'Product published.' : 'Product unpublished.');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const tierKeys: (keyof ProductTiers)[] = [
    'individualBasic',
    'individualPremium',
    'companyPremium',
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Product &amp; pricing</CardTitle>
          <CardDescription>
            Package this assessment into three tiers — Individual Basic, Individual
            Premium, and Company Premium (team vouchers).
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
              Tiers:{' '}
              {tierKeys
                .filter((k) => product.tiers[k].enabled)
                .map((k) => TIER_LABELS[k])
                .join(' · ') || 'none enabled'}
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
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              {tierKeys.map((key) => {
                const tier = form.tiers[key];
                return (
                  <div key={key} className="space-y-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">{TIER_LABELS[key]}</h4>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={tier.enabled}
                          onChange={(e) => setTier(key, { enabled: e.target.checked })}
                        />
                        Enabled
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Price label</Label>
                        <Input
                          value={tier.priceLabel}
                          onChange={(e) => setTier(key, { priceLabel: e.target.value })}
                          placeholder={key === 'individualBasic' ? 'Free' : 'e.g. $29'}
                        />
                      </div>
                      {key === 'companyPremium' ? (
                        <div className="space-y-1.5">
                          <Label>Seats (voucher codes)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={1000}
                            value={form.tiers.companyPremium.seats}
                            onChange={(e) =>
                              setTier('companyPremium', {
                                seats: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Blurb</Label>
                      <Input
                        value={tier.blurb}
                        onChange={(e) => setTier(key, { blurb: e.target.value })}
                        placeholder="One line describing this tier."
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <ErrorMessage message={saveError} />

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save()} disabled={saving}>
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
