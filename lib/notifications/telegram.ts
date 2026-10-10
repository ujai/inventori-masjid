/**
 * Telegram Bot API wrapper.
 * Uses HTML parse_mode — simpler escaping than MarkdownV2.
 * Docs: https://core.telegram.org/bots/api#sendmessage
 */

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? '';

type TelegramResult = { ok: boolean; description?: string };

/** Send a plain or HTML-formatted message to a Telegram chat. */
export async function sendTelegramMessage(
  chatId: string | number,
  html: string,
): Promise<void> {
  const token = BOT_TOKEN();
  if (!token) {
    console.log('[Telegram] Not configured — would send to', chatId, ':', html.slice(0, 80));
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    chatId,
      text:       html,
      parse_mode: 'HTML',
    }),
  });

  const json: TelegramResult = await res.json();
  if (!json.ok) {
    // Log but don't throw — notification failure must not break the cron
    console.error('[Telegram] sendMessage failed:', json.description);
  }
}

/** Register the webhook URL with Telegram. Call once after deploy. */
export async function registerWebhook(webhookUrl: string): Promise<TelegramResult> {
  const token = BOT_TOKEN();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url:          webhookUrl,
      secret_token: secret ?? undefined,
      allowed_updates: ['message'],
    }),
  });
  return res.json();
}

/** Escape HTML special characters for Telegram HTML messages. */
export function tgEscape(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
