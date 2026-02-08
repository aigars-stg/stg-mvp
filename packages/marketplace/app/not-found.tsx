/**
 * Root-level not-found — handles requests outside any locale route (e.g. /xyz/abc).
 * No layout context available, so uses inline styles with Nordic palette.
 */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: '#ECEFF4',
          color: '#2E3440',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center', padding: '24px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: 'rgba(136, 192, 208, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#88C0D0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 8,
              color: '#2E3440',
            }}
          >
            Page not found
          </h1>
          <p
            style={{
              fontSize: 15,
              color: '#4C566A',
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            The page you are looking for does not exist or may have been moved.
          </p>

          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              backgroundColor: '#D08770',
              color: '#FEFEFE',
              border: 'none',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Go to homepage
          </a>
        </div>
      </body>
    </html>
  );
}
