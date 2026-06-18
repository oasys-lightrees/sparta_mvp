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
    <header className="border-b">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="text-lg font-bold">
          SPARTA
        </Link>
        <nav className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <Link
                href={roleHome(user.role)}
                className="text-sm text-muted-foreground hover:text-foreground"
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
