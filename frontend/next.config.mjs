/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Linting is enforced as a dedicated CI step (`npm run lint:ci`, which the
    // `quality` job runs before any image is built), so we don't re-run ESLint
    // during `next build`. This keeps the production image build a pure
    // compile + type-check step (faster, single source of lint truth).
    // TypeScript type errors still fail the build (that's a separate check).
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
