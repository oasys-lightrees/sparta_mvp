import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { LanguageProvider } from '@/lib/i18n/LanguageProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
// Confident "academy" display voice for headings, hero, stats, report ranks.
const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const APP_NAME = 'LATO';
const APP_TITLE = 'LATO — LighTech Assessment Tool';
const APP_DESCRIPTION =
  'Create assessments, deliver clear reports, and monetize your expertise.';

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
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
