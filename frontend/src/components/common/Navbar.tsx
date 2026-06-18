'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { roleHome } from '@/lib/roles';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const onLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            S
          </span>
          <span className="text-lg font-semibold tracking-tight">SPARTA</span>
        </Link>
        <nav className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <Link
                href={roleHome(user.role)}
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                {user.email}
              </Link>
              <Button variant="outline" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
