import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="container flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">SPARTA</h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Discover and take self-assessments. Create an account to unlock your
        personalized report.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/register">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Assessment list, blog and contact sections coming next.
      </p>
    </div>
  );
}
