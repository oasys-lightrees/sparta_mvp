import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { LanguageProvider } from '@/lib/i18n/LanguageProvider';
import { Navbar } from '@/components/common/Navbar';
import { ShieldMark } from '@/components/brand/ShieldMark';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
// Spartan "academy" display voice for headings, hero, stats, report ranks.
const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'SPARTA — AI-Powered Assessment Platform',
  description:
    'Create tests, generate questions with AI, deliver personalized reports, and monetize your expertise.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <LanguageProvider>
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
                  <span className="hidden sm:inline">
                    · The Growth Academy
                  </span>
                </div>
                <span>© {new Date().getFullYear()} SPARTA</span>
              </div>
            </footer>
          </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
