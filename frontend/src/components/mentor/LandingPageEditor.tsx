'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { assessmentAppApi, type AppConfigPatch } from '@/services/assessment-app.api';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { ImageSourceField } from '@/components/mentor/ImageSourceField';
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
import type { AssessmentApp } from '@/types/assessment-app';

// One card in the configurable Benefits section.
type BenefitItem = { title: string; body: string; imageUrl: string };

// The editable subset of the branded landing/app config.
type Form = {
  brandName: string;
  monogram: string;
  logoUrl: string;
  faviconUrl: string;
  primary: string;
  secondary: string;
  accent: string;
  mode: 'light' | 'dark' | 'auto';
  radius: 'sharp' | 'soft' | 'round';
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroImageUrl: string;
  ctaPrimary: string;
  ctaSecondary: string;
  aboutEnabled: boolean;
  aboutTitle: string;
  aboutBody: string;
  aboutImageUrl: string;
  benefitsEnabled: boolean;
  benefitsTitle: string;
  benefitsItems: BenefitItem[];
  contactEnabled: boolean;
  contactTitle: string;
  contactName: string;
  contactWhatsapp: string;
  finalEnabled: boolean;
  finalTitle: string;
  finalSubtitle: string;
  finalButton: string;
  seoTitle: string;
  seoDescription: string;
};

const fromConfig = (a: AssessmentApp): Form => ({
  brandName: a.brand.brandName,
  monogram: a.brand.monogram,
  logoUrl: a.brand.logoUrl ?? '',
  faviconUrl: a.brand.faviconUrl ?? '',
  primary: a.brand.colors.primary,
  secondary: a.brand.colors.secondary,
  accent: a.brand.colors.accent,
  mode: a.theme.mode,
  radius: a.theme.radius,
  heroEyebrow: a.landing.hero.eyebrow,
  heroTitle: a.landing.hero.title,
  heroSubtitle: a.landing.hero.subtitle,
  heroDescription: a.landing.hero.description,
  heroImageUrl: a.landing.hero.heroImageUrl ?? '',
  ctaPrimary: a.landing.hero.ctaPrimary,
  ctaSecondary: a.landing.hero.ctaSecondary,
  aboutEnabled: a.landing.about.enabled,
  aboutTitle: a.landing.about.title,
  aboutBody: a.landing.about.body,
  aboutImageUrl: a.landing.about.imageUrl ?? '',
  benefitsEnabled: a.landing.benefits.enabled,
  benefitsTitle: a.landing.benefits.title,
  benefitsItems: a.landing.benefits.items.map((it) => ({
    title: it.title,
    body: it.body,
    imageUrl: it.imageUrl ?? '',
  })),
  contactEnabled: a.landing.contact.enabled,
  contactTitle: a.landing.contact.title,
  contactName: a.landing.contact.name,
  contactWhatsapp: a.landing.contact.whatsapp,
  finalEnabled: a.landing.finalCta.enabled,
  finalTitle: a.landing.finalCta.title,
  finalSubtitle: a.landing.finalCta.subtitle,
  finalButton: a.landing.finalCta.button,
  seoTitle: a.seo.title,
  seoDescription: a.seo.description,
});

// Build the deep-merge patch (only the fields this editor owns).
const toPatch = (f: Form): AppConfigPatch => ({
  brand: {
    brandName: f.brandName.trim(),
    monogram: f.monogram.trim(),
    logoUrl: f.logoUrl.trim() === '' ? null : f.logoUrl.trim(),
    faviconUrl: f.faviconUrl.trim() === '' ? null : f.faviconUrl.trim(),
    colors: { primary: f.primary, secondary: f.secondary, accent: f.accent },
  },
  theme: { mode: f.mode, radius: f.radius },
  landing: {
    hero: {
      eyebrow: f.heroEyebrow,
      title: f.heroTitle.trim(),
      subtitle: f.heroSubtitle,
      description: f.heroDescription,
      heroImageUrl: f.heroImageUrl.trim() === '' ? null : f.heroImageUrl.trim(),
      ctaPrimary: f.ctaPrimary.trim(),
      ctaSecondary: f.ctaSecondary,
    },
    about: {
      enabled: f.aboutEnabled,
      title: f.aboutTitle.trim() === '' ? 'About' : f.aboutTitle.trim(),
      body: f.aboutBody,
      imageUrl: f.aboutImageUrl.trim() === '' ? null : f.aboutImageUrl.trim(),
    },
    benefits: {
      enabled: f.benefitsEnabled,
      title: f.benefitsTitle.trim(),
      items: f.benefitsItems
        // Drop fully empty cards so blank rows never render.
        .filter(
          (it) =>
            it.title.trim() !== '' ||
            it.body.trim() !== '' ||
            it.imageUrl.trim() !== '',
        )
        .map((it) => ({
          title: it.title.trim(),
          body: it.body.trim(),
          imageUrl: it.imageUrl.trim() === '' ? null : it.imageUrl.trim(),
        })),
    },
    contact: {
      enabled: f.contactEnabled,
      title: f.contactTitle.trim() === '' ? 'Contact' : f.contactTitle.trim(),
      name: f.contactName.trim(),
      whatsapp: f.contactWhatsapp.trim(),
    },
    finalCta: {
      enabled: f.finalEnabled,
      title: f.finalTitle.trim(),
      subtitle: f.finalSubtitle,
      button: f.finalButton.trim(),
    },
  },
  seo: { title: f.seoTitle, description: f.seoDescription },
});

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function TextField({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {textarea ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-background"
          aria-label={`${label} color`}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
      </div>
    </div>
  );
}

/**
 * Mentor editor for an assessment's branded landing page. Reads/writes the
 * existing app-config endpoints (deep-merge PATCH + reset), exposing the
 * high-impact subset: brand, theme, hero, final CTA and SEO. The rest of the
 * rich config (features, testimonials, plans…) is preserved by the merge.
 */
export function LandingPageEditor({
  assessmentId,
  isPublished,
}: {
  assessmentId: string;
  isPublished: boolean;
}) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<AssessmentApp | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    assessmentAppApi
      .getMentorConfig(assessmentId)
      .then((c) => {
        if (!active) return;
        setConfig(c);
        setForm(fromConfig(c));
      })
      .catch((e) => {
        if (active)
          setLoadError(e instanceof Error ? e.message : 'Failed to load landing config');
      });
    return () => {
      active = false;
    };
  }, [assessmentId]);

  const set = (patch: Partial<Form>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  // Benefits card list helpers.
  const setBenefit = (i: number, patch: Partial<BenefitItem>) =>
    setForm((f) =>
      f
        ? {
            ...f,
            benefitsItems: f.benefitsItems.map((it, idx) =>
              idx === i ? { ...it, ...patch } : it,
            ),
          }
        : f,
    );
  const addBenefit = () =>
    setForm((f) =>
      f && f.benefitsItems.length < 8
        ? { ...f, benefitsItems: [...f.benefitsItems, { title: '', body: '', imageUrl: '' }] }
        : f,
    );
  const removeBenefit = (i: number) =>
    setForm((f) =>
      f ? { ...f, benefitsItems: f.benefitsItems.filter((_, idx) => idx !== i) } : f,
    );

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      const updated = await assessmentAppApi.updateConfig(assessmentId, toPatch(form));
      setConfig(updated);
      setForm(fromConfig(updated));
      setEditing(false);
      setNotice(t('le.savedNotice'));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Reset the landing page to its default? Your customizations will be lost.')) {
      return;
    }
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      const fresh = await assessmentAppApi.resetConfig(assessmentId);
      setConfig(fresh);
      setForm(fromConfig(fresh));
      setEditing(false);
      setNotice(t('le.resetNotice'));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to reset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>{t('le.title')}</CardTitle>
          <CardDescription>
            <code className="text-xs">/a/{assessmentId.slice(0, 8)}…</code>
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          {isPublished ? (
            <Button asChild variant="outline" size="sm">
              <a href={`/a/${assessmentId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                {t('le.view')}
              </a>
            </Button>
          ) : null}
          {config && !editing ? (
            <Button size="sm" onClick={() => setEditing(true)}>
              {t('le.customize')}
            </Button>
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
        {!isPublished ? (
          <p className="rounded-md border border-dashed bg-accent/20 px-3 py-2 text-xs text-muted-foreground">
            {t('le.publishHint')} <code>/a/{assessmentId.slice(0, 8)}…</code>
          </p>
        ) : null}

        {!config && !loadError ? <Loading /> : null}

        {config && !editing ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {[config.brand.colors.primary, config.brand.colors.secondary, config.brand.colors.accent].map(
                (c, i) => (
                  <span
                    key={i}
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ),
              )}
            </div>
            <div className="text-sm">
              <span className="font-medium">{config.brand.brandName}</span>
              <span className="text-muted-foreground"> · {config.landing.hero.title}</span>
            </div>
          </div>
        ) : null}

        {config && editing && form ? (
          <div className="space-y-5">
            {/* Brand */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('le.brand')}
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label={t('le.brandName')} value={form.brandName} onChange={(v) => set({ brandName: v })} />
                <TextField
                  label={t('le.monogram')}
                  value={form.monogram}
                  onChange={(v) => set({ monogram: v.slice(0, 2) })}
                />
              </div>
              <ImageSourceField
                label={t('le.logo')}
                value={form.logoUrl}
                onChange={(v) => set({ logoUrl: v })}
                placeholder="https://example.com/logo.svg"
              />
              <ImageSourceField
                label={t('le.favicon')}
                value={form.faviconUrl}
                onChange={(v) => set({ faviconUrl: v })}
                placeholder="https://example.com/favicon.png"
                helpText={t('le.faviconHelp')}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <ColorField label={t('le.primary')} value={form.primary} onChange={(v) => set({ primary: v })} />
                <ColorField label={t('le.secondary')} value={form.secondary} onChange={(v) => set({ secondary: v })} />
                <ColorField label={t('le.accent')} value={form.accent} onChange={(v) => set({ accent: v })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('le.scheme')}</Label>
                  <select
                    className={selectClass}
                    value={form.mode}
                    onChange={(e) => set({ mode: e.target.value as Form['mode'] })}
                  >
                    <option value="auto">{t('le.schemeAuto')}</option>
                    <option value="light">{t('le.schemeLight')}</option>
                    <option value="dark">{t('le.schemeDark')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('le.corners')}</Label>
                  <select
                    className={selectClass}
                    value={form.radius}
                    onChange={(e) => set({ radius: e.target.value as Form['radius'] })}
                  >
                    <option value="sharp">{t('le.cornersSharp')}</option>
                    <option value="soft">{t('le.cornersSoft')}</option>
                    <option value="round">{t('le.cornersRound')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Hero */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('le.hero')}
              </h4>
              <TextField label={t('le.eyebrow')} value={form.heroEyebrow} onChange={(v) => set({ heroEyebrow: v })} />
              <TextField label={t('le.headline')} value={form.heroTitle} onChange={(v) => set({ heroTitle: v })} />
              <TextField label={t('le.subtitle')} value={form.heroSubtitle} onChange={(v) => set({ heroSubtitle: v })} textarea />
              <TextField
                label={t('le.description')}
                value={form.heroDescription}
                onChange={(v) => set({ heroDescription: v })}
                textarea
              />
              <ImageSourceField
                label={t('le.heroPhoto')}
                value={form.heroImageUrl}
                onChange={(v) => set({ heroImageUrl: v })}
                placeholder="https://example.com/hero.jpg"
                helpText={t('le.heroPhotoHelp')}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label={t('le.primaryBtn')} value={form.ctaPrimary} onChange={(v) => set({ ctaPrimary: v })} />
                <TextField label={t('le.secondaryBtn')} value={form.ctaSecondary} onChange={(v) => set({ ctaSecondary: v })} />
              </div>
            </div>

            {/* About */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('le.aboutSection')}
                </h4>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.aboutEnabled}
                    onChange={(e) => set({ aboutEnabled: e.target.checked })}
                  />
                  {t('le.showAbout')}
                </label>
              </div>
              {form.aboutEnabled ? (
                <>
                  <p className="text-xs text-muted-foreground">{t('le.aboutHelp')}</p>
                  <TextField
                    label={t('le.titleField')}
                    value={form.aboutTitle}
                    onChange={(v) => set({ aboutTitle: v })}
                    placeholder={t('le.aboutTitlePh')}
                  />
                  <TextField
                    label={t('le.description')}
                    value={form.aboutBody}
                    onChange={(v) => set({ aboutBody: v })}
                    placeholder={t('le.aboutBodyPh')}
                    textarea
                  />
                  <ImageSourceField
                    label={t('le.aboutPhoto')}
                    value={form.aboutImageUrl}
                    onChange={(v) => set({ aboutImageUrl: v })}
                    placeholder="https://example.com/about.jpg"
                    helpText={t('le.aboutPhotoHelp')}
                  />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t('le.aboutHidden')}</p>
              )}
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('le.benefitsSection')}
                </h4>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.benefitsEnabled}
                    onChange={(e) => set({ benefitsEnabled: e.target.checked })}
                  />
                  {t('le.showBenefits')}
                </label>
              </div>
              {form.benefitsEnabled ? (
                <>
                  <p className="text-xs text-muted-foreground">{t('le.benefitsHelp')}</p>
                  <TextField
                    label={t('le.sectionTitle')}
                    value={form.benefitsTitle}
                    onChange={(v) => set({ benefitsTitle: v })}
                    placeholder={t('le.benefitsTitlePh')}
                  />
                  {form.benefitsItems.map((it, i) => (
                    <div key={i} className="space-y-3 rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t('le.card')} {i + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBenefit(i)}
                        >
                          {t('le.remove')}
                        </Button>
                      </div>
                      <TextField
                        label={t('le.heading')}
                        value={it.title}
                        onChange={(v) => setBenefit(i, { title: v })}
                        placeholder={t('le.benefitHeadingPh')}
                      />
                      <TextField
                        label={t('le.description')}
                        value={it.body}
                        onChange={(v) => setBenefit(i, { body: v })}
                        placeholder={t('le.benefitDescPh')}
                        textarea
                      />
                      <ImageSourceField
                        label={t('le.iconImage')}
                        value={it.imageUrl}
                        onChange={(v) => setBenefit(i, { imageUrl: v })}
                        placeholder="https://example.com/icon.png"
                        helpText={t('le.iconImageHelp')}
                      />
                    </div>
                  ))}
                  {form.benefitsItems.length < 8 ? (
                    <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
                      {t('le.addCard')}
                    </Button>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t('le.benefitsHidden')}</p>
              )}
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('le.contactSection')}
                </h4>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.contactEnabled}
                    onChange={(e) => set({ contactEnabled: e.target.checked })}
                  />
                  {t('le.showContact')}
                </label>
              </div>
              {form.contactEnabled ? (
                <>
                  <p className="text-xs text-muted-foreground">{t('le.contactHelp')}</p>
                  <TextField
                    label={t('le.titleField')}
                    value={form.contactTitle}
                    onChange={(v) => set({ contactTitle: v })}
                    placeholder={t('le.contactTitlePh')}
                  />
                  <TextField
                    label={t('le.contactName')}
                    value={form.contactName}
                    onChange={(v) => set({ contactName: v })}
                    placeholder={t('le.contactNamePh')}
                  />
                  <TextField
                    label={t('le.whatsapp')}
                    value={form.contactWhatsapp}
                    onChange={(v) => set({ contactWhatsapp: v })}
                    placeholder={t('le.whatsappPh')}
                  />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t('le.contactHidden')}</p>
              )}
            </div>

            {/* Final CTA */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('le.closing')}
                </h4>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.finalEnabled}
                    onChange={(e) => set({ finalEnabled: e.target.checked })}
                  />
                  {t('le.showClosing')}
                </label>
              </div>
              {form.finalEnabled ? (
                <>
                  <TextField label={t('le.titleField')} value={form.finalTitle} onChange={(v) => set({ finalTitle: v })} />
                  <TextField label={t('le.subtitle')} value={form.finalSubtitle} onChange={(v) => set({ finalSubtitle: v })} textarea />
                  <TextField label={t('le.button')} value={form.finalButton} onChange={(v) => set({ finalButton: v })} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t('le.closingHidden')}</p>
              )}
            </div>

            {/* SEO */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('le.seo')}
              </h4>
              <TextField label={t('le.pageTitle')} value={form.seoTitle} onChange={(v) => set({ seoTitle: v })} />
              <TextField
                label={t('le.metaDesc')}
                value={form.seoDescription}
                onChange={(v) => set({ seoDescription: v })}
                textarea
              />
            </div>

            <ErrorMessage message={saveError} />

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? t('le.saving') : t('le.save')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setForm(fromConfig(config));
                  setEditing(false);
                  setSaveError('');
                }}
                disabled={saving}
              >
                {t('le.cancel')}
              </Button>
              <Button variant="outline" className="ml-auto" onClick={reset} disabled={saving}>
                {t('le.reset')}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
