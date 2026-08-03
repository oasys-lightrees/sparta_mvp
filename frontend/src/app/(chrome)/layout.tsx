import { Navbar } from '@/components/common/Navbar';
import { ShieldMark } from '@/components/brand/ShieldMark';

// Shared SPARTA chrome (navbar + footer) for the platform's own pages.
// Branded per-assessment routes live outside this group so they render as
// their own product with no SPARTA chrome. Route groups don't affect URLs.
export default function ChromeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-muted/30">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <ShieldMark className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold tracking-[0.18em] text-foreground">
              SPARTA
            </span>
            <span className="hidden sm:inline">· The Growth Academy</span>
          </div>
          <span>© {new Date().getFullYear()} SPARTA</span>
        </div>
      </footer>
    </div>
  );
}
