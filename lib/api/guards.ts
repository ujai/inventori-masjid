import { headers } from 'next/headers';
import { auth, type Session } from '@/lib/auth';
import { ApiError } from './responses';

export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Sila log masuk');
  }
  if (session.user.active === false) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'Akaun anda telah dinyahaktifkan. Sila hubungi admin.',
    );
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Akses ditolak. Hanya admin dibenarkan.');
  }
  return session;
}

export function parseRouteId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'VALIDATION_ERROR', 'ID tidak sah');
  return id;
}
