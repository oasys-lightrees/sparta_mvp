import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LATO — LighTech Assessment Tool',
    short_name: 'LATO',
    description:
      'Create tests, generate questions with AI, deliver personalized reports, and monetize your expertise.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#27406F',
    icons: [
      {
        src: '/icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
      },
      {
        src: '/apple-icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
      },
    ],
  };
}
