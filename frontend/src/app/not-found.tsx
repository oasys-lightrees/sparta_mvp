import Link from 'next/link';

// Graceful global 404 (e.g. an unknown /a/<id> or any bad URL). Kept minimal and
// neutral so it reads cleanly regardless of which surface linked here.
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <p
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '.75rem',
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: '#8b93a4',
          }}
        >
          Error 404
        </p>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: 10 }}>
          Page not found
        </h1>
        <p style={{ marginTop: 10, color: '#6b7280', lineHeight: 1.6 }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginTop: 22,
            padding: '.7em 1.3em',
            borderRadius: 10,
            fontWeight: 600,
            color: '#fff',
            background: '#4f46e5',
            textDecoration: 'none',
          }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
