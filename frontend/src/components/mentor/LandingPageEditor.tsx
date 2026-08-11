'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { assessmentAppApi, type AppConfigPatch } from '@/services/assessment-app.api';
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
      setNotice('Landing page saved.');
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
      setNotice('Landing page reset to default.');
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
          <CardTitle>Landing page</CardTitle>
          <CardDescription>
            Your assessment&apos;s own branded page at{' '}
            <code className="text-xs">/a/{assessmentId.slice(0, 8)}…</code>
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          {isPublished ? (
            <Button asChild variant="outline" size="sm">
              <a href={`/a/${assessmentId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </a>
            </Button>
          ) : null}
          {config && !editing ? (
            <Button size="sm" onClick={() => setEditing(true)}>
              Customize
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
            Publish this assessment to make its landing page live at{' '}
            <code>/a/{assessmentId.slice(0, 8)}…</code>
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
                Brand
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Brand name" value={form.brandName} onChange={(v) => set({ brandName: v })} />
                <TextField
                  label="Monogram (1–2 letters)"
                  value={form.monogram}
                  onChange={(v) => set({ monogram: v.slice(0, 2) })}
                />
              </div>
              <ImageSourceField
                label="Landing page logo"
                value={form.logoUrl}
                onChange={(v) => set({ logoUrl: v })}
                placeholder="https://example.com/logo.svg"
              />
              <ImageSourceField
                label="Favicon (browser tab icon)"
                value={form.faviconUrl}
                onChange={(v) => set({ faviconUrl: v })}
                placeholder="https://example.com/favicon.png"
                helpText="Shown in the browser tab for your landing page. A square PNG, SVG or ICO-style image works best. PNG, SVG, JPG, JPEG or WEBP · up to 5 MB."
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <ColorField label="Primary" value={form.primary} onChange={(v) => set({ primary: v })} />
                <ColorField label="Secondary" value={form.secondary} onChange={(v) => set({ secondary: v })} />
                <ColorField label="Accent" value={form.accent} onChange={(v) => set({ accent: v })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Color scheme</Label>
                  <select
                    className={selectClass}
                    value={form.mode}
                    onChange={(e) => set({ mode: e.target.value as Form['mode'] })}
                  >
                    <option value="auto">Auto (follow device)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Corners</Label>
                  <select
                    className={selectClass}
                    value={form.radius}
                    onChange={(e) => set({ radius: e.target.value as Form['radius'] })}
                  >
                    <option value="sharp">Sharp</option>
                    <option value="soft">Soft</option>
                    <option value="round">Round</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Hero */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hero
              </h4>
              <TextField label="Eyebrow" value={form.heroEyebrow} onChange={(v) => set({ heroEyebrow: v })} />
              <TextField label="Headline" value={form.heroTitle} onChange={(v) => set({ heroTitle: v })} />
              <TextField label="Subtitle" value={form.heroSubtitle} onChange={(v) => set({ heroSubtitle: v })} textarea />
              <TextField
                label="Description"
                value={form.heroDescription}
                onChange={(v) => set({ heroDescription: v })}
                textarea
              />
              <ImageSourceField
                label="Landing page / hero photo (optional)"
                value={form.heroImageUrl}
                onChange={(v) => set({ heroImageUrl: v })}
                placeholder="https://example.com/hero.jpg (replaces the default preview)"
                helpText="Shown as the hero image, replacing the default preview. PNG, SVG, JPG, JPEG or WEBP · up to 5 MB."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Primary button" value={form.ctaPrimary} onChange={(v) => set({ ctaPrimary: v })} />
                <TextField label="Secondary button" value={form.ctaSecondary} onChange={(v) => set({ ctaSecondary: v })} />
              </div>
            </div>

            {/* Final CTA */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Closing call to action
                </h4>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.finalEnabled}
                    onChange={(e) => set({ finalEnabled: e.target.checked })}
                  />
                  Show closing section
                </label>
              </div>
              {form.finalEnabled ? (
                <>
                  <TextField label="Title" value={form.finalTitle} onChange={(v) => set({ finalTitle: v })} />
                  <TextField label="Subtitle" value={form.finalSubtitle} onChange={(v) => set({ finalSubtitle: v })} textarea />
                  <TextField label="Button" value={form.finalButton} onChange={(v) => set({ finalButton: v })} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The closing call-to-action section is hidden on your landing page.
                </p>
              )}
            </div>

            {/* SEO */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Search &amp; social (SEO)
              </h4>
              <TextField label="Page title" value={form.seoTitle} onChange={(v) => set({ seoTitle: v })} />
              <TextField
                label="Meta description"
                value={form.seoDescription}
                onChange={(v) => set({ seoDescription: v })}
                textarea
              />
            </div>

            <ErrorMessage message={saveError} />

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save landing page'}
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
                Cancel
              </Button>
              <Button variant="outline" className="ml-auto" onClick={reset} disabled={saving}>
                Reset to default
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
