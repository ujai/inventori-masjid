import type { NextConfig } from 'next';

/**
 * HTTP security headers applied to all responses.
 *
 * Decisions (May 2026 best practices):
 * - X-Frame-Options: DENY — prevent clickjacking
 * - X-Content-Type-Options: nosniff — stop MIME-type confusion attacks
 * - Referrer-Policy: strict-origin — don't leak full URL to third parties
 * - Permissions-Policy: lock down features the app doesn't use
 * - HSTS: 2 years, includeSubDomains — enforce HTTPS
 *
 * CSP deliberately omitted for now: a mistuned CSP breaks the app silently.
 * Add it incrementally once the UI is stable.
 */
const securityHeaders = [
  { key: 'X-Frame-Options',        value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  // @react-pdf/renderer uses Node.js internals — keep it out of the RSC bundle.
  serverExternalPackages: ['@react-pdf/renderer'],

  // Ensure logo.png is included in the handover-export serverless function bundle.
  // Without this, Vercel's Node File Trace excludes public/ assets and readFileSync throws ENOENT.
  outputFileTracingIncludes: {
    '/api/reports/handover/export': ['./public/logo.png'],
  },

  images: {
    remotePatterns: [
      // Cloudflare R2 — uncomment and fill in account ID when using next/image
      // { protocol: 'https', hostname: 'YOUR_ACCOUNT_ID.r2.cloudflarestorage.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
