'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AccessState } from '@/types';

/**
 * Access gate for gated assessments (PAID/VOUCHER) on the platform take flow.
 * Renders the right call to action for the mode; the backend enforces the gate
 * regardless, so this is purely to guide the user to the correct next step.
 */
export function AccessGate({
  access,
  assessmentId,
  isLoggedIn,
  purchasing,
  error,
  onPurchase,
}: {
  access: AccessState;
  assessmentId: string;
  isLoggedIn: boolean;
  purchasing: boolean;
  error: string;
  onPurchase: () => void;
}) {
  const next = encodeURIComponent(`/assessments/${assessmentId}`);

  const body = () => {
    // Must sign in to pay/redeem.
    if (access.requires_auth_to_start && !isLoggedIn) {
      return (
        <>
          <p className="text-sm text-muted-foreground">
            {access.grant_via === 'voucher'
              ? 'Log in to redeem your voucher and start this assessment.'
              : 'Log in to get access and start this assessment.'}
          </p>
          <Button asChild>
            <Link href={`/login?next=${next}`}>Log in to continue</Link>
          </Button>
        </>
      );
    }

    if (access.grant_via === 'voucher') {
      return (
        <>
          <p className="text-sm text-muted-foreground">
            This assessment is unlocked with a voucher code. Redeem yours to start.
          </p>
          <Button asChild>
            <Link href={`/a/${assessmentId}/redeem`}>Redeem a voucher</Link>
          </Button>
        </>
      );
    }

    // PAID — buy access with tokens.
    const cost = access.access_token_cost;
    const balance = access.token_balance ?? 0;
    const affordable = balance >= cost;
    return (
      <>
        <p className="text-sm text-muted-foreground">
          Get access for <strong>{cost} tokens</strong>. Your balance: {balance}{' '}
          token{balance === 1 ? '' : 's'}.
        </p>
        <ErrorMessage message={error} />
        {affordable ? (
          <Button onClick={onPurchase} disabled={purchasing} variant="bronze">
            {purchasing ? 'Processing…' : `Pay ${cost} tokens to start`}
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You need {cost - balance} more token{cost - balance === 1 ? '' : 's'}.
            </p>
            <Button asChild variant="bronze">
              <Link href="/dashboard">Get tokens</Link>
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-accent/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          {access.mode === 'VOUCHER' ? 'Voucher required' : 'Paid assessment'}
        </CardTitle>
        <CardDescription>
          You need access before you can start this assessment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{body()}</CardContent>
    </Card>
  );
}
