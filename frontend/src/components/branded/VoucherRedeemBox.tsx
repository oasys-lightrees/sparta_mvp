'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Compact voucher-code input for the branded landing page. Carries the entered
 * code to the redeem page (which handles auth + the actual redemption), so a
 * visitor with a company voucher can redeem straight from the shared link.
 */
export function VoucherRedeemBox({ redeemHref }: { redeemHref: string }) {
  const router = useRouter();
  const [code, setCode] = useState('');

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    router.push(c ? `${redeemHref}?code=${encodeURIComponent(c)}` : redeemHref);
  };

  return (
    <form
      onSubmit={go}
      style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 460,
        marginInline: 'auto',
      }}
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABCD-EF23-GH45"
        autoComplete="off"
        aria-label="Voucher code"
        style={{
          flex: '1 1 220px',
          height: 46,
          padding: '0 14px',
          borderRadius: 'var(--r-btn, 10px)',
          border: '1px solid var(--line)',
          background: 'var(--ground)',
          color: 'var(--ink)',
          fontFamily: 'var(--mono)',
          letterSpacing: '.05em',
        }}
      />
      <button type="submit" className="lato-btn lato-btn--grad">
        Redeem voucher
      </button>
    </form>
  );
}
