/**
 * Resend email assertion helpers for UAT §8.4
 *
 * Uses Resend's List Emails API (added Oct 2025) to verify that emails
 * were actually sent after triggering the cron/test endpoint.
 *
 * Docs: https://resend.com/docs/api-reference/emails/list-emails
 *
 * Requires env var: RESEND_API_KEY (same key used by the app, or a separate one)
 * Set it in .env.test or export it before running tests.
 */

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

export function getResendClient(): Resend {
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not set. Add it to .env.test to enable email assertions.',
    );
  }
  return new Resend(apiKey);
}

export type SentEmail = {
  id: string;
  to: string[];
  from: string;
  subject: string | null;
  last_event: string;
  created_at: string;
};

/**
 * Waits up to `timeoutMs` for an email matching the predicate to appear
 * in the Resend sent-emails list. Polls every 2 seconds.
 */
export async function waitForEmail(
  predicate: (email: SentEmail) => boolean,
  options: { timeoutMs?: number; description?: string } = {},
): Promise<SentEmail> {
  const { timeoutMs = 30_000, description = 'matching email' } = options;
  const resend = getResendClient();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const { data, error } = await resend.emails.list({ limit: 20 });

    if (error) throw new Error(`Resend API error: ${error.message}`);
    if (!data) throw new Error('Resend API returned no data');

    // data.data is the array of emails per the API spec
    const emails = (data as unknown as { data: SentEmail[] }).data ?? [];
    const match = emails.find(predicate);
    if (match) return match;

    await new Promise(r => setTimeout(r, 2_000));
  }

  throw new Error(`Timed out waiting for ${description} after ${timeoutMs}ms`);
}

/**
 * Retrieves the full HTML content of an email by ID.
 */
export async function getEmailContent(emailId: string): Promise<string> {
  const resend = getResendClient();
  const { data, error } = await resend.emails.get(emailId);
  if (error) throw new Error(`Resend get email error: ${error.message}`);
  return (data as unknown as { html: string })?.html ?? '';
}

/**
 * Assert that a notification email was sent after triggering /api/cron/test.
 *
 * @param recipientEmail  The email address of the test user
 * @param afterMs         Epoch ms — only look for emails created after this time
 */
export async function assertNotificationEmailSent(
  recipientEmail: string,
  afterMs: number,
): Promise<SentEmail> {
  const email = await waitForEmail(
    e =>
      e.to.includes(recipientEmail) &&
      new Date(e.created_at).getTime() >= afterMs,
    { description: `notification email to ${recipientEmail}` },
  );

  if (!email.subject) {
    throw new Error(`Email found but has no subject (id: ${email.id})`);
  }

  return email;
}
