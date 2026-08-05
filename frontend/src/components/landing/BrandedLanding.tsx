import { Fragment, type CSSProperties } from 'react';
import type { AssessmentApp, Plan } from '@/types/assessment-app';
import type { AccessMode } from '@/types';
import './lato-theme.css';

/* Minimal inline icon set (line style). */
const ICONS: Record<string, string> = {
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  gauge: '<path d="M12 13a2 2 0 1 0 2-2"/><path d="M4 20a9 9 0 1 1 16 0"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M16 8l-2.5 5.5L8 16l2.5-5.5z"/>',
  bolt: '<path d="M13 2L3 14h7l-1 8 10-12h-7z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 21v-4h6v4"/>',
  ticket: '<path d="M3 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const path = ICONS[name] ?? ICONS.spark;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

/* Theme wrapper: injects the 3 brand colors as CSS vars; the stylesheet
   derives everything else. Radius/spacing via data-attributes. */
function themeVars(app: AssessmentApp): CSSProperties {
  const c = app.brand.colors;
  return {
    ['--b1' as string]: c.primary,
    ['--b2' as string]: c.secondary,
    ['--b3' as string]: c.accent,
    ['--on-b' as string]: c.onBrand,
  };
}

const BrandMark = ({ app }: { app: AssessmentApp }) => (
  <span className="lato-brand__m">
    {app.brand.logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={app.brand.logoUrl} alt={app.brand.brandName} />
    ) : (
      app.brand.monogram
    )}
  </span>
);

export function BrandedLanding({
  app,
  startHref = '#products',
  loginHref = '/login',
  companyHref,
  redeemHref,
  accessMode,
  accessTokenCost = 0,
}: {
  app: AssessmentApp;
  startHref?: string;
  loginHref?: string;
  companyHref?: string;
  redeemHref?: string;
  accessMode?: AccessMode | null;
  accessTokenCost?: number;
}) {
  const { brand, theme, landing, assessment, products, reports } = app;
  // Primary CTA reflects the access model: paid shows the token cost, voucher
  // routes to redemption, free/freemium keep the configured copy. The actual
  // gate is enforced on the start page + backend — this only labels the door.
  const primaryLabel =
    accessMode === 'VOUCHER'
      ? 'Redeem a voucher to start'
      : accessMode === 'PAID'
        ? `Get access · ${accessTokenCost} tokens`
        : landing.hero.ctaPrimary;
  const primaryHref =
    accessMode === 'VOUCHER' ? (redeemHref ?? startHref) : startHref;
  const comps = reports.competencies.slice(0, 3);
  const codes = [`${brand.monogram}9F-2K`, `${brand.monogram}7Q-4X`, `${brand.monogram}1B-8M`];
  const flow = [
    { t: 'Company buys', d: 'Pick a seat package', icon: 'building', alt: false },
    { t: 'Get vouchers', d: 'Unique codes generated', icon: 'ticket', alt: true },
    { t: 'Share codes', d: 'Send to employees', icon: 'share', alt: true },
    { t: 'They redeem', d: 'One code, one seat', icon: 'users', alt: true },
    { t: 'They assess', d: 'Each gets a report', icon: 'check', alt: true },
    { t: 'Org dashboard', d: 'Aggregated analytics', icon: 'chart', alt: false },
  ];

  return (
    <div
      className="lato-app"
      style={themeVars(app)}
      data-radius={theme.radius}
      data-spacing={theme.spacing}
      data-theme={theme.mode === 'auto' ? undefined : theme.mode}
    >
      {/* NAV */}
      <header className="lato-nav">
        <div className="lato-wrap lato-nav__in">
          <a className="lato-brand" href="#top" aria-label={brand.brandName}>
            <BrandMark app={app} />
            <span className="lato-brand__n">
              {brand.brandName}
              <small>Assessment</small>
            </span>
          </a>
          <nav className="lato-links" aria-label="Primary">
            <a href="#products">Products</a>
            <a href="#why">About</a>
            <a href="#process">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lato-nav__r">
            <a href={loginHref} className="lato-login">
              Log in
            </a>
            <a href={primaryHref} className="lato-btn">
              {primaryLabel}
            </a>
            <details className="lato-mnav">
              <summary aria-label="Menu">
                <Icon name="arrow" size={18} />
              </summary>
              <div className="lato-mnav__panel">
                <a href="#products">Products</a>
                <a href="#why">About</a>
                <a href="#process">How it works</a>
                <a href="#faq">FAQ</a>
                <a href={loginHref}>Log in</a>
                <a href={primaryHref} className="lato-btn lato-btn--block">
                  {primaryLabel}
                </a>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="lato-hero">
          <div className="lato-hero__bg" />
          <div className="lato-hero__grid" />
          <div className="lato-wrap lato-hero__in">
            <div>
              {landing.hero.eyebrow ? (
                <span className="lato-pill">{landing.hero.eyebrow}</span>
              ) : null}
              <h1>{landing.hero.title}</h1>
              {landing.hero.subtitle ? (
                <p className="lato-hero__sub">{landing.hero.subtitle}</p>
              ) : null}
              {landing.hero.description ? (
                <p className="lato-hero__desc">{landing.hero.description}</p>
              ) : null}
              <div className="lato-hero__cta">
                <a href={primaryHref} className="lato-btn lato-btn--grad lato-btn--lg">
                  {primaryLabel}
                </a>
                {landing.hero.ctaSecondary ? (
                  <a href="#process" className="lato-btn lato-btn--ghost lato-btn--lg">
                    {landing.hero.ctaSecondary}
                  </a>
                ) : null}
              </div>
              <div className="lato-hero__meta">
                <span>
                  <Icon name="gauge" size={16} />
                  <b>{assessment.meta.estimatedMinutes} min</b>
                </span>
                <span>
                  <Icon name="check" size={16} />
                  <b>{assessment.meta.questionCount} questions</b>
                </span>
                <span>
                  <Icon name="users" size={16} />
                  <b>{assessment.meta.audience}</b>
                </span>
              </div>
            </div>
            <div className="lato-hero__media">
              <div className="lato-preview">
                <div className="lato-preview__top">
                  <span className="lato-preview__dot" />
                  <span className="lato-preview__dot" />
                  <span className="lato-preview__dot" />
                  <span className="lato-preview__tag">AI Report</span>
                </div>
                <div className="lato-prow">
                  <div className="lato-ring">
                    <b>
                      78<small>/100</small>
                    </b>
                  </div>
                  <div>
                    <div style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Your result</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: 2 }}>
                      {reports.free.title}
                    </div>
                    <div className="lato-bars">
                      {(comps.length ? comps : [{ key: 'Strengths' }, { key: 'Gaps' }, { key: 'Plan' }]).map(
                        (co, i) => (
                          <div className="lato-bar" key={i}>
                            <span>{co.key}</span>
                            <div className="lato-bar__t">
                              <div className="lato-bar__f" style={{ width: `${[82, 64, 71][i] ?? 70}%` }} />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
                <div className="lato-preview__foot">
                  <span className="lato-chip">✓ Strengths</span>
                  <span className="lato-chip">✓ Gaps</span>
                  <span className="lato-chip">✓ Roadmap</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST */}
        {(landing.trust.companies.length || landing.trust.stats.length) ? (
          <section className="lato-trust" aria-label="Trust">
            <div className="lato-wrap">
              {landing.trust.companies.length ? (
                <>
                  <p className="lato-trust__lead">{landing.trust.lead}</p>
                  <div className="lato-trust__row">
                    {landing.trust.companies.map((n) => (
                      <span className="lato-logo" key={n}>
                        <span className="lato-logo__m">{n[0]}</span>
                        {n}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
              {landing.trust.stats.length ? (
                <div className="lato-stats">
                  {landing.trust.stats.map((s, i) => (
                    <div className="lato-stat" key={i}>
                      <b>{s.value}</b>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* FEATURES */}
        {landing.features.length ? (
          <section className="lato-section" id="why">
            <div className="lato-wrap lato-center">
              <span className="lato-eyebrow">Why this assessment</span>
              <h2 className="lato-h">Clarity you can act on</h2>
            </div>
            <div className="lato-wrap">
              <div className="lato-cards">
                {landing.features.map((f, i) => (
                  <div className="lato-card" key={i}>
                    <div className="lato-card__i">
                      <Icon name={f.icon} />
                    </div>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* PROCESS */}
        {landing.process.length ? (
          <section className="lato-section lato-section--tint" id="process">
            <div className="lato-wrap lato-center">
              <span className="lato-eyebrow">How it works</span>
              <h2 className="lato-h">From answers to a plan</h2>
            </div>
            <div className="lato-wrap">
              <div className="lato-steps">
                {landing.process.map((s, i) => (
                  <div className="lato-step" key={i}>
                    <div className="lato-step__n" />
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* PRODUCTS */}
        <section className="lato-section" id="products">
          <div className="lato-wrap lato-center">
            <span className="lato-eyebrow">{products.eyebrow}</span>
            <h2 className="lato-h">{products.title}</h2>
            {products.subtitle ? <p className="lato-sub">{products.subtitle}</p> : null}
          </div>
          <div className="lato-wrap">
            <div className="lato-plans">
              {products.plans.map((p, i) => (
                <PlanCard key={i} plan={p} codes={codes} />
              ))}
            </div>
          </div>
        </section>

        {/* VOUCHER FLOW */}
        <section className="lato-section lato-section--tint" id="teams">
          <div className="lato-wrap lato-center">
            <span className="lato-eyebrow">For companies</span>
            <h2 className="lato-h">Buy once, deploy to your whole team</h2>
            <p className="lato-sub">
              Purchase a package, hand out codes, and watch aggregated insight roll into one
              dashboard.
            </p>
          </div>
          <div className="lato-wrap">
            <div className="lato-flow">
              {flow.map((n, i) => (
                <Fragment key={i}>
                  <div className={`lato-flow__n${n.alt ? ' alt' : ''}`}>
                    <div className="lato-flow__i">
                      <Icon name={n.icon} size={20} />
                    </div>
                    <div className="lato-flow__t">{n.t}</div>
                    <div className="lato-flow__d">{n.d}</div>
                  </div>
                  {i < flow.length - 1 ? (
                    <div className="lato-flow__l">
                      <Icon name="arrow" size={20} />
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
            {companyHref || redeemHref ? (
              <div
                className="lato-hero__cta"
                style={{ justifyContent: 'center', marginTop: 44 }}
              >
                {companyHref ? (
                  <a href={companyHref} className="lato-btn lato-btn--grad lato-btn--lg">
                    Buy team vouchers
                  </a>
                ) : null}
                {redeemHref ? (
                  <a href={redeemHref} className="lato-btn lato-btn--ghost lato-btn--lg">
                    Redeem a code
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* TESTIMONIALS */}
        {landing.testimonials.length ? (
          <section className="lato-section" id="testimonials">
            <div className="lato-wrap lato-center">
              <span className="lato-eyebrow">Testimonials</span>
              <h2 className="lato-h">What people say</h2>
            </div>
            <div className="lato-wrap">
              <div className="lato-quotes">
                {landing.testimonials.map((t, i) => (
                  <div className="lato-quote" key={i}>
                    <div className="lato-quote__s">★★★★★</div>
                    <p>“{t.quote}”</p>
                    <div className="lato-quote__w">
                      <span className="lato-av">{t.name[0]}</span>
                      <span>
                        <b>{t.name}</b>
                        <span>
                          {t.role}
                          {t.company ? ` · ${t.company}` : ''}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* FAQ */}
        {landing.faq.length ? (
          <section className="lato-section lato-section--tint" id="faq">
            <div className="lato-wrap lato-center">
              <span className="lato-eyebrow">FAQ</span>
              <h2 className="lato-h">Questions, answered</h2>
            </div>
            <div className="lato-wrap">
              <div className="lato-faq">
                {landing.faq.map((f, i) => (
                  <details key={i} open={i === 0}>
                    <summary>
                      <span className="q">{f.q}</span>
                      <span className="pm" />
                    </summary>
                    <div className="a">{f.a}</div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* FINAL CTA */}
        <section className="lato-section" style={{ paddingBottom: 0 }}>
          <div className="lato-wrap">
            <div className="lato-final">
              <h2>{landing.finalCta.title}</h2>
              {landing.finalCta.subtitle ? <p>{landing.finalCta.subtitle}</p> : null}
              <a href={primaryHref} className="lato-btn lato-btn--lg">
                {accessMode === 'VOUCHER' ? primaryLabel : landing.finalCta.button}
              </a>
              {landing.finalCta.fineprint ? (
                <p className="fp">{landing.finalCta.fineprint}</p>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="lato-footer">
        <div className="lato-wrap">
          <div className="lato-fgrid">
            <div>
              <a className="lato-brand" href="#top">
                <BrandMark app={app} />
                <span className="lato-brand__n">{brand.brandName}</span>
              </a>
              <p className="lato-fabout">{app.seo.description}</p>
            </div>
            <div className="lato-fcol">
              <h4>Product</h4>
              <a href="#products">Pricing</a>
              <a href="#process">How it works</a>
              <a href="#teams">For teams</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="lato-fcol">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div className="lato-fcol">
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Security</a>
            </div>
          </div>
          <div className="lato-fbar">
            <span>
              © {new Date().getFullYear()} {brand.brandName}. All rights reserved.
            </span>
            <span>Powered by LATO — the assessment platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlanCard({ plan, codes }: { plan: Plan; codes: string[] }) {
  const btnClass = plan.highlight
    ? 'lato-btn lato-btn--grad lato-btn--block'
    : 'lato-btn lato-btn--ghost lato-btn--block';
  return (
    <div className={`lato-plan${plan.highlight ? ' lato-plan--hot' : ''}`}>
      {plan.highlight && plan.badge ? <span className="lato-plan__badge">{plan.badge}</span> : null}
      <div className="lato-plan__name">{plan.name}</div>
      <div className="lato-plan__tag">{plan.tagline}</div>
      <div className="lato-plan__price">
        <b>{plan.price}</b>
        {plan.period ? <span>{plan.period}</span> : null}
      </div>
      {plan.voucher ? (
        <div className="lato-voucher">
          <div className="lato-voucher__l">Voucher codes included</div>
          <div className="lato-voucher__c">
            {codes.map((c) => (
              <span className="lato-code" key={c}>
                {c}
              </span>
            ))}
            <span className="lato-code lato-code--more">+ more</span>
          </div>
        </div>
      ) : null}
      <ul className="lato-feat">
        {plan.features.map((f) => (
          <li key={f}>
            <Icon name="check" size={16} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a href="#" className={btnClass}>
        {plan.cta}
      </a>
    </div>
  );
}
