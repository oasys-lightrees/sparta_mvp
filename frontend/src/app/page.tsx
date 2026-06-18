import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublishedAssessments } from '@/components/assessment/PublishedAssessments';
import { BlogSection } from '@/components/blog/BlogSection';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="container flex flex-col items-center gap-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">SPARTA</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Discover and take self-assessments. Take any test for free — create an
          account to unlock your personalized report.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <PublishedAssessments />
      <BlogSection />

      {/* CTA */}
      <section className="border-t">
        <div className="container flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="text-2xl font-bold">Ready to learn about yourself?</h2>
          <p className="max-w-lg text-muted-foreground">
            Pick an assessment above and get started — no login required to take
            the test.
          </p>
          <Button asChild>
            <Link href="/register">Create your account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
