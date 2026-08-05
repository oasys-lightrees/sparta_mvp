'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Coins } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { roleHome } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { LatoMark } from '@/components/brand/LatoMark';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { cn } from '@/lib/utils';

function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="flex items-center rounded-md border text-xs">
      {(['en', 'id'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            'px-2 py-1 font-medium uppercase transition-colors',
            lang === l
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const balance = useTokenBalance();

  const onLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LatoMark className="h-7 w-7 text-primary" />
          <span className="font-display text-lg font-bold tracking-[0.18em]">
            LATO
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <LanguageSwitcher />
          {loading ? null : user ? (
            <>
              {balance !== null ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 rounded-full border bg-accent/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  title="Token balance"
                >
                  <Coins className="h-3.5 w-3.5 text-bronze" />
                  {balance}
                </Link>
              ) : null}
              <Link
                href={roleHome(user.role)}
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                {user.email}
              </Link>
              <Button variant="outline" size="sm" onClick={onLogout}>
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t('nav.login')}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{t('nav.register')}</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
