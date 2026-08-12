'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { productApi } from '@/services/product.api';
import { formatIdr } from '@/lib/currency';
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
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { TranslationKey } from '@/lib/i18n';
import type {
  MentorProduct,
  PricingTier,
  ProductContentBlock,
  ProductStatus,
  ProductTierKind,
  VoucherPackage,
} from '@/types';

const KIND_OPTIONS: { value: ProductTierKind; labelKey: TranslationKey }[] = [
  { value: 'FREE', labelKey: 'pe.kindFree' },
  { value: 'PAID', labelKey: 'pe.kindPaid' },
  { value: 'VOUCHER', labelKey: 'pe.kindVoucher' },
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
  amount: 0,
  ctaLabel: 'Get started',
  imageUrl: null,
  highlight: false,
  content: [],
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
    id: 'paid',
    title: 'Full access',
    description: 'Unlock full access to this assessment.',
    kind: 'PAID',
    ctaLabel: 'Get access',
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

const makePackage = (over: Partial<VoucherPackage> = {}): VoucherPackage => ({
  id: newId(),
  label: '',
  seats: 10,
  amount: 0,
  imageUrl: null,
  ...over,
});

const normalizePackages = (packages: unknown): VoucherPackage[] =>
  Array.isArray(packages) ? (packages as VoucherPackage[]) : [];

type Form = {
  name: string;
  description: string;
  status: ProductStatus;
  tiers: PricingTier[];
  voucherPackages: VoucherPackage[];
};

const makeContentBlock = (type: 'video' | 'text'): ProductContentBlock => ({
  id: newId(),
  type,
  value: '',
});

const fromProduct = (p: MentorProduct): Form => ({
  name: p.name,
  description: p.description ?? '',
  status: p.status,
  tiers: normalizeTiers(p.tiers),
  voucherPackages: normalizePackages(p.voucher_packages),
});

/**
 * Expert editor for an assessment's product — a list of pricing tiers, each a
 * marketing card (title, description, price in Rupiah, button, image) with a
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
  const { t } = useLanguage();
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
        if (active)
          setLoadError(e instanceof Error ? e.message : 'Failed to load product');
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
            voucherPackages: [],
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

  const setPackage = (index: number, patch: Partial<VoucherPackage>) =>
    setForm((f) =>
      f
        ? {
            ...f,
            voucherPackages: f.voucherPackages.map((p, i) =>
              i === index ? { ...p, ...patch } : p,
            ),
          }
        : f,
    );

  const addPackage = () =>
    setForm((f) =>
      f && f.voucherPackages.length < 10
        ? { ...f, voucherPackages: [...f.voucherPackages, makePackage()] }
        : f,
    );

  const removePackage = (index: number) =>
    setForm((f) =>
      f ? { ...f, voucherPackages: f.voucherPackages.filter((_, i) => i !== index) } : f,
    );

  // Per-tier bonus content (delivered on the result page after purchase).
  const tierContent = (tier: PricingTier): ProductContentBlock[] => tier.content ?? [];

  const setTierContent = (
    tierIndex: number,
    blockIndex: number,
    patch: Partial<ProductContentBlock>,
  ) =>
    setTier(tierIndex, {
      content: tierContent(form!.tiers[tierIndex]).map((b, i) =>
        i === blockIndex ? { ...b, ...patch } : b,
      ),
    });

  const addTierContent = (tierIndex: number, type: 'video' | 'text') => {
    const current = tierContent(form!.tiers[tierIndex]);
    if (current.length >= 20) return;
    setTier(tierIndex, { content: [...current, makeContentBlock(type)] });
  };

  const removeTierContent = (tierIndex: number, blockIndex: number) =>
    setTier(tierIndex, {
      content: tierContent(form!.tiers[tierIndex]).filter((_, i) => i !== blockIndex),
    });

  const moveTierContent = (tierIndex: number, blockIndex: number, dir: -1 | 1) => {
    const content = [...tierContent(form!.tiers[tierIndex])];
    const next = blockIndex + dir;
    if (next < 0 || next >= content.length) return;
    [content[blockIndex], content[next]] = [content[next], content[blockIndex]];
    setTier(tierIndex, { content });
  };

  const persist = async (payload: {
    name: string;
    description: string | null;
    status: ProductStatus;
    tiers: PricingTier[];
    voucherPackages: VoucherPackage[];
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
        voucherPackages: form.voucherPackages,
      });
      setForm(fromProduct(saved));
      setEditing(false);
      setNotice(
        saved.status === 'PUBLISHED' ? t('pe.savedPublished') : t('pe.savedDraft'),
      );
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('pe.errSave'));
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
        voucherPackages: normalizePackages(product.voucher_packages),
      });
      setNotice(next === 'PUBLISHED' ? t('pe.published') : t('pe.unpublished'));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('pe.errUpdate'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>{t('pe.title')}</CardTitle>
          <CardDescription>{t('pe.desc')}</CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          {loaded && product && !editing ? (
            <>
              <Button variant="outline" size="sm" onClick={togglePublish} disabled={saving}>
                {product.status === 'PUBLISHED'
                  ? t('mentor.unpublish')
                  : t('mentor.publish')}
              </Button>
              <Button size="sm" onClick={startEdit} disabled={saving}>
                {t('pe.customize')}
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
            <p className="text-sm text-muted-foreground">{t('pe.noProduct')}</p>
            <Button size="sm" onClick={startEdit}>
              {t('pe.setup')}
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
                .filter((tier) => tier.enabled)
                .map((tier) => tier.title || tier.kind)
                .join(' · ') || t('pe.noTiersEnabled')}
            </p>
          </div>
        ) : null}

        {editing && form ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('pe.name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  placeholder={assessmentTitle}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('pe.status')}</Label>
                <select
                  className={selectClass}
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, status: e.target.value as ProductStatus } : f))
                  }
                >
                  <option value="DRAFT">{t('pe.statusDraft')}</option>
                  <option value="PUBLISHED">{t('pe.statusPublished')}</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('pe.descOptional')}</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => (f ? { ...f, description: e.target.value } : f))
                }
                placeholder={t('pe.descPh')}
              />
            </div>

            {/* Tiers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('pe.tiers')}
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTier}
                  disabled={form.tiers.length >= 6}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('pe.addTier')}
                </Button>
              </div>
              <p className="rounded-md border border-dashed bg-accent/20 px-3 py-2 text-xs text-muted-foreground">
                {t('pe.tierHelp')}
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
                        {t('pe.enabled')}
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={tier.highlight}
                          onChange={(e) => setTier(i, { highlight: e.target.checked })}
                        />
                        {t('pe.highlight')}
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTier(i)}
                      aria-label={t('pe.removeTier')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t('pe.tierTitle')}</Label>
                      <Input
                        value={tier.title}
                        onChange={(e) => setTier(i, { title: e.target.value })}
                        placeholder={t('pe.tierTitlePh')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('pe.pricingType')}</Label>
                      <select
                        className={selectClass}
                        value={tier.kind}
                        onChange={(e) => setTier(i, { kind: e.target.value as ProductTierKind })}
                      >
                        {KIND_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {t(o.labelKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t('pe.priceLabel')}</Label>
                      <Input
                        value={tier.priceLabel}
                        onChange={(e) => setTier(i, { priceLabel: e.target.value })}
                        placeholder={t('pe.priceLabelPh')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('pe.priceRp')}</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        value={tier.amount}
                        onChange={(e) =>
                          setTier(i, { amount: Math.max(0, Number(e.target.value) || 0) })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t('pe.tierDesc')}</Label>
                    <Input
                      value={tier.description}
                      onChange={(e) => setTier(i, { description: e.target.value })}
                      placeholder={t('pe.tierDescPh')}
                    />
                  </div>

                  {/* Image shown between the title and the button on the card. */}
                  <ImageSourceField
                    label={t('pe.tierImage')}
                    value={tier.imageUrl ?? ''}
                    onChange={(v) => setTier(i, { imageUrl: v.trim() === '' ? null : v.trim() })}
                    helpText={t('pe.tierImageHelp')}
                  />

                  <div className="space-y-1.5">
                    <Label>{t('pe.buttonLabel')}</Label>
                    <Input
                      value={tier.ctaLabel}
                      onChange={(e) => setTier(i, { ctaLabel: e.target.value })}
                      placeholder={t('pe.buttonLabelPh')}
                    />
                  </div>

                  {/* Bonus content delivered to a buyer of THIS tier, on the
                      result page after they finish (not on the landing). */}
                  <div className="space-y-3 rounded-md border border-dashed bg-accent/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t('pe.bonus')}
                        </h5>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t('pe.bonusHelp')}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTierContent(i, 'text')}
                          disabled={tierContent(tier).length >= 20}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t('pe.text')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addTierContent(i, 'video')}
                          disabled={tierContent(tier).length >= 20}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t('pe.video')}
                        </Button>
                      </div>
                    </div>

                    {tierContent(tier).map((b, bi) => (
                      <div key={b.id} className="space-y-2 rounded-md border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {b.type === 'video' ? t('pe.video') : t('pe.text')}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="px-2"
                              onClick={() => moveTierContent(i, bi, -1)}
                              disabled={bi === 0}
                              aria-label={t('pe.moveUp')}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="px-2"
                              onClick={() => moveTierContent(i, bi, 1)}
                              disabled={bi === tierContent(tier).length - 1}
                              aria-label={t('pe.moveDown')}
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTierContent(i, bi)}
                              aria-label={t('pe.removeBlock')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {b.type === 'video' ? (
                          <Input
                            type="url"
                            value={b.value}
                            onChange={(e) => setTierContent(i, bi, { value: e.target.value })}
                            placeholder="https://youtube.com/watch?v=…"
                          />
                        ) : (
                          <Textarea
                            value={b.value}
                            onChange={(e) => setTierContent(i, bi, { value: e.target.value })}
                            placeholder={t('pe.textPh')}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {form.tiers.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  {t('pe.noTiers')}
                </p>
              ) : null}
            </div>

            {/* Company / batch voucher packages */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('pe.packages')}
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPackage}
                  disabled={form.voucherPackages.length >= 10}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('pe.addPackage')}
                </Button>
              </div>
              <p className="rounded-md border border-dashed bg-accent/20 px-3 py-2 text-xs text-muted-foreground">
                {t('pe.packagesHelp')}
              </p>

              {form.voucherPackages.map((pkg, i) => (
                <div key={pkg.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_auto_auto_auto]">
                  <div className="space-y-1.5">
                    <Label>{t('pe.packageName')}</Label>
                    <Input
                      value={pkg.label}
                      onChange={(e) => setPackage(i, { label: e.target.value })}
                      placeholder={t('pe.packageNamePh')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('pe.seats')}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      className="w-24"
                      value={pkg.seats}
                      onChange={(e) =>
                        setPackage(i, { seats: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('pe.packagePrice')}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      className="w-32"
                      value={pkg.amount}
                      onChange={(e) =>
                        setPackage(i, { amount: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePackage(i)}
                      aria-label={t('pe.removePackage')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {pkg.seats > 0 && pkg.amount > 0 ? (
                    <p className="text-xs text-muted-foreground sm:col-span-4">
                      {formatIdr(Math.round(pkg.amount / pkg.seats))} {t('pe.perSeat')}
                    </p>
                  ) : null}
                  <div className="sm:col-span-4">
                    <ImageSourceField
                      label={t('pe.packageImage')}
                      value={pkg.imageUrl ?? ''}
                      onChange={(v) =>
                        setPackage(i, { imageUrl: v.trim() === '' ? null : v.trim() })
                      }
                      helpText={t('pe.packageImageHelp')}
                    />
                  </div>
                </div>
              ))}

              {form.voucherPackages.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  {t('pe.noPackages')}
                </p>
              ) : null}
            </div>

            <ErrorMessage message={saveError} />

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? t('pe.saving') : t('pe.save')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setSaveError('');
                }}
                disabled={saving}
              >
                {t('pe.cancel')}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
