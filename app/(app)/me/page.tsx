import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TelegramSection } from './TelegramSection';

export default async function MePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  // Fetch fresh user row for notification prefs (session may be stale)
  const [dbUser] = await db
    .select({
      id:                          user.id,
      name:                        user.name,
      email:                       user.email,
      role:                        user.role,
      phone:                       user.phone,
      telegramChatId:              user.telegramChatId,
      telegramUsername:            user.telegramUsername,
      notificationEmailEnabled:    user.notificationEmailEnabled,
      notificationTelegramEnabled: user.notificationTelegramEnabled,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!dbUser) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-6">
      <h1 className="text-2xl font-bold text-primary-700">Profil Saya</h1>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Maklumat akaun</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Row label="Nama"  value={dbUser.name} />
          <Row label="Emel"  value={dbUser.email} />
          <Row
            label="Peranan"
            value={
              <span className="inline-block px-2 py-0.5 rounded bg-primary-100 text-primary-800 text-xs font-medium">
                {dbUser.role === 'admin' ? 'Admin' : 'AJK'}
              </span>
            }
          />
          {dbUser.phone && <Row label="Telefon" value={dbUser.phone} />}
        </dl>
        <p className="text-xs text-slate-500 mt-4">
          Log masuk diuruskan oleh Google. Untuk menukar emel, sila uruskan akaun Google anda.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Pilihan pemberitahuan</h2>
        <TelegramSection
          linked={!!dbUser.telegramChatId}
          username={dbUser.telegramUsername}
          telegramEnabled={dbUser.notificationTelegramEnabled}
          emailEnabled={dbUser.notificationEmailEnabled}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{value}</dd>
    </div>
  );
}
