/**
 * Better Auth server configuration.
 *
 * - Google OAuth ONLY (simplified per client preference)
 *   Every committee member uses Gmail; eliminates password management.
 * - Sign-up disabled at provider level: only pre-invited users can sign in
 * - Account linking by email so admin-pre-created users can sign in via Google
 * - 7-day session (per A1)
 * - Custom user fields exposed in session
 * - nextCookies() plugin so server actions auto-set cookies
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/db/client';
import { APP_NAME } from '@/lib/site';
import * as schema from '@/db/schema';

const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: baseUrl,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      disableSignUp: true, // only pre-invited users (email already in user table) can sign in
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // refresh once per day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,            // 5 minutes
    },
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'ajk',
        input: false, // never settable from public sign-up
      },
      phone: {
        type: 'string',
        required: false,
        input: false,
      },
      active: {
        type: 'boolean',
        defaultValue: true,
        input: false,
      },
      telegramChatId: {
        type: 'string',
        required: false,
        input: false,
      },
      telegramUsername: {
        type: 'string',
        required: false,
        input: false,
      },
      notificationEmailEnabled: {
        type: 'boolean',
        defaultValue: true,
        input: false,
      },
      notificationTelegramEnabled: {
        type: 'boolean',
        defaultValue: false,
        input: false,
      },
    },
  },

  trustedOrigins: [
    baseUrl,
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
  ],

  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session['user'];
