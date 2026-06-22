import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { LanguageProvider } from '@/lib/i18n/LanguageProvider';
import { Navbar } from '@/components/common/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <LanguageProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t bg-muted/30">
              <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-muted-foreground sm:flex-row">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                    S
                  </span>
                  <span className="font-medium text-foreground">SPARTA</span>
                  <span className="hidden sm:inline">
                    · AI-Powered Assessment Platform
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
