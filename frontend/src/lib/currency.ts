// Wallet amounts are stored and transacted in IDR (whole rupiah). One helper so
// every surface formats balance the same way, e.g. 50000 -> "Rp 50.000".
export const formatIdr = (n: number): string =>
  `Rp ${Math.round(n).toLocaleString('id-ID')}`;
