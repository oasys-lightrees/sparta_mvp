import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PublishedAssessments } from '@/components/assessment/PublishedAssessments';
import { BlogSection } from '@/components/blog/BlogSection';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted/60 to-background">
        <div className="container flex flex-col items-center gap-6 py-24 text-center md:py-32">
          <Badge variant="secondary" className="px-3 py-1">
            Self-assessment platform
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Understand yourself with thoughtful assessments
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Discover and take assessments for free. Create an account to unlock
            your personalized report — no payment required to get started.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">Get started free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#assessments">Browse assessments</Link>
            </Button>
          </div>
        </div>
      </section>

      <div id="assessments" className="scroll-mt-20">
        <PublishedAssessments />
      </div>
      <BlogSection />

      {/* CTA */}
      <section className="border-t bg-muted/40">
        <div className="container flex flex-col items-center gap-4 py-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to learn about yourself?
          </h2>
          <p className="max-w-lg text-muted-foreground">
            Pick an assessment above and get started — no login required to take
            the test.
          </p>
          <Button asChild size="lg">
            <Link href="/register">Create your account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
