'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Coins,
  FileText,
  Mail,
  Sparkles,
  TrendingUp,
  Wand2,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PublishedAssessments } from '@/components/assessment/PublishedAssessments';
import { BlogSection } from '@/components/blog/BlogSection';
import { LatoMark } from '@/components/brand/LatoMark';
import { StrengthBar } from '@/components/brand/StrengthBar';

const FEATURES = [
  {
    icon: FileText,
    title: 'Branded Landing Pages',
    description:
      'Every assessment gets its own branded landing page — your logo, colors, copy, cover photo, and products.',
  },
  {
    icon: Coins,
    title: 'Token Payments',
    description:
      'Learners top up a token wallet and spend it to unlock your paid assessments — powered by a real payment gateway.',
  },
  {
    icon: Wand2,
    title: 'Team Vouchers',
    description:
      'Sell voucher packages so a company can assess a whole team, hand out codes, and track everyone’s results.',
  },
  {
    icon: TrendingUp,
    title: 'Expert Revenue Tracking',
    description:
      'See every paid unlock and your total token revenue in one clean dashboard — no spreadsheets required.',
  },
  {
    icon: BarChart3,
    title: 'Assessment Analytics',
    description:
      'Track attempts, published tests, and average scores so you know exactly how your assessments perform.',
  },
  {
    icon: Mail,
    title: 'Email Report Delivery',
    description:
      'Results are delivered straight to inboxes with your own templated message — automatically after each submission.',
  },
];

const MENTOR_STEPS = [
  {
    title: 'Create an assessment',
    description:
      'Set up your test, thresholds, questions, and pricing — exactly how you want it.',
  },
  {
    title: 'Publish & share',
    description:
      'Publish your assessment and share the link. Anyone can take it, no sign-up required.',
  },
  {
    title: 'Earn from paid access',
    description:
      'Charge tokens for access or sell team voucher packages, and track the revenue.',
  },
];

const USER_STEPS = [
  {
    title: 'Take a challenge',
    description:
      'Pick an assessment and answer at your own pace — get an instant free result.',
  },
  {
    title: 'Get your report',
    description:
      'Create a free account to claim your report and keep your history.',
  },
  {
    title: 'Go further',
    description:
      'Use tokens to unlock paid assessments, or redeem a company voucher to get access.',
  },
];

export default function HomePage() {
  const { t } = useLanguage();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/40 via-background to-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--primary)/0.12),transparent)]"
        />
        <div className="container relative grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
          {/* Message */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="flex items-center justify-center gap-2 lg:justify-start">
              <LatoMark className="h-6 w-6 text-primary" />
              <span className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {t('landing.badge')}
              </span>
            </div>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              {t('landing.heroTitlePrefix')}{' '}
              <span className="text-bronze">
                {t('landing.heroTitleHighlight')}
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground lg:mx-0">
              {t('landing.heroSubtitle')}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild variant="bronze" size="lg">
                <Link href="#assessments">
                  {t('landing.ctaCreate')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#how">{t('landing.ctaDemo')}</Link>
              </Button>
            </div>
          </div>

          {/* Growth Blueprint preview — "this platform builds my profile" */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 -z-10 rounded-3xl bg-primary/5 blur-xl" />
            <div className="overflow-hidden rounded-2xl border bg-card shadow-lg shadow-primary/10">
              <div className="flex items-center justify-between bg-primary px-5 py-4 text-primary-foreground">
                <div className="flex items-center gap-2">
                  <LatoMark className="h-5 w-5 text-primary-foreground" />
                  <span className="font-display text-sm font-semibold tracking-wide">
                    {t('landing.blueprintTitle')}
                  </span>
                </div>
                <Sparkles className="h-4 w-4 text-bronze" />
              </div>
              <div className="space-y-5 p-6">
                <StrengthBar
                  label={t('landing.metricStrength')}
                  value={85}
                  accent="primary"
                />
                <StrengthBar
                  label={t('landing.metricDiscipline')}
                  value={72}
                  accent="bronze"
                />
                <StrengthBar
                  label={t('landing.metricPotential')}
                  value={91}
                  accent="success"
                />
                <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-muted-foreground">
                    {t('report.totalScore')}
                  </span>
                  <span className="tnum font-display text-2xl font-bold text-primary">
                    83
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo assessments — surfaced right below the hero for easy access */}
      <div id="assessments" className="scroll-mt-20 border-b">
        <PublishedAssessments />
      </div>

      {/* Problem → Solution */}
      <section className="border-b">
        <div className="container grid gap-8 py-16 md:grid-cols-2 md:py-20">
          <div className="space-y-3">
            <Badge variant="outline">The problem</Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t('landing.problemTitle')}
            </h2>
            <p className="text-muted-foreground">{t('landing.problemBody')}</p>
          </div>
          <div className="space-y-3 rounded-lg border bg-accent/40 p-6">
            <Badge variant="bronze">The LATO way</Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t('landing.solutionTitle')}
            </h2>
            <p className="text-muted-foreground">{t('landing.solutionBody')}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b">
        <div className="container py-20 md:py-24">
          <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
            <Badge variant="outline">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-muted-foreground">
              From branded landing pages to revenue tracking, LATO handles the
              full lifecycle of your assessments.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md">
                <CardHeader className="space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="scroll-mt-20 border-b bg-muted/30">
        <div className="container py-20 md:py-24">
          <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
            <Badge variant="outline">How it works</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.howTitle')}
            </h2>
            <p className="text-muted-foreground">
              Experts create and earn. Users learn and grow. Everyone gets a
              smooth, modern experience.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <Badge className="mb-1 w-fit">For experts</Badge>
                <CardTitle>Create &amp; monetize</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-5">
                  {MENTOR_STEPS.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      <div className="space-y-1">
                        <p className="font-medium leading-tight">{s.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Badge variant="secondary" className="mb-1 w-fit">
                  For users
                </Badge>
                <CardTitle>Take &amp; grow</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-5">
                  {USER_STEPS.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                        {i + 1}
                      </span>
                      <div className="space-y-1">
                        <p className="font-medium leading-tight">{s.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing / Monetization */}
      <section className="border-b">
        <div className="container py-20 md:py-24">
          <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
            <Badge variant="outline">Pricing</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('landing.pricingTitle')}
            </h2>
            <p className="text-muted-foreground">
              Free assessments are always free. Paid assessments unlock with
              tokens, or with a company voucher code.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-xl">Free assessments</CardTitle>
                </div>
                <CardDescription>
                  Instant results for every respondent.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Take any free published assessment</li>
                  <li>• Immediate score and report</li>
                  <li>• Create an account to save your history</li>
                  <li>• No payment required</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="relative flex flex-col border-primary/40 shadow-sm">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Paid assessments</CardTitle>
                </div>
                <CardDescription>
                  Unlocked with tokens or a company voucher.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Top up a token wallet, then unlock access</li>
                  <li>• Or redeem a company voucher code</li>
                  <li>• Results delivered to your inbox</li>
                  <li>• Experts earn revenue on every unlock</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <BlogSection />

      {/* Final CTA — the courage/action moment (crimson) */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center gap-5 py-20 text-center">
          <LatoMark className="h-10 w-10 text-bronze" />
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            {t('landing.finalCtaTitle')}
          </h2>
          <p className="max-w-lg text-primary-foreground/80">
            {t('landing.finalCtaSubtitle')}
          </p>
          <Button asChild size="lg" variant="crimson">
            <Link href="#assessments">
              {t('landing.getStarted')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
