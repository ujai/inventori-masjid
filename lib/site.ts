/**
 * Organisation branding. Set these per deployment in .env.local.
 * NEXT_PUBLIC_ so the same values are available in client components.
 */
export const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME || 'Masjid Contoh';
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || `Inventori ${ORG_NAME}`;
