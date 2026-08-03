import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { LanguageProvider } from '@/lib/i18n/LanguageProvider';

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
          <LanguageProvider>{children}</LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
