import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Don't lint build output, dependencies, or generated types.
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
    ],
  },
  // Next.js recommended rules (Core Web Vitals) + TypeScript rules.
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;
