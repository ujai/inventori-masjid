import { ZodError } from 'zod';

/** True when err (or its cause) is a Postgres unique-constraint violation. */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const check = (e: unknown) =>
    !!e && typeof e === 'object' && (e as { code?: string }).code === '23505' &&
    (!constraint || (e as { constraint?: string }).constraint === constraint);
  return check(err) || check((err as { cause?: unknown })?.cause);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init: ResponseInit = {}) {
  return Response.json({ data }, init);
}

export function paged<T>(data: T[], page: number, pageSize: number, total: number) {
  return Response.json({
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export function noContent() {
  return new Response(null, { status: 204 });
}

export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data tidak sah',
          // Only expose field-level details in development.
          // In production we log server-side; client only needs the message.
          details: process.env.NODE_ENV !== 'production' ? err.issues : undefined,
        },
      },
      { status: 400 },
    );
  }
  if (err instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      { status: err.status },
    );
  }
  if (isUniqueViolation(err)) {
    const cause = (err as { cause?: { constraint?: string; detail?: string } })?.cause;
    return Response.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'Rekod dengan nilai yang sama sudah wujud.',
          details: process.env.NODE_ENV !== 'production' ? cause?.detail : undefined,
        },
      },
      { status: 409 },
    );
  }
  console.error('Unhandled API error', err);
  return Response.json(
    {
      error: {
        code: 'INTERNAL',
        message: 'Ralat dalaman. Sila cuba lagi.',
      },
    },
    { status: 500 },
  );
}
