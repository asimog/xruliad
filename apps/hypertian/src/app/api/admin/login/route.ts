import { z } from 'zod';
import { fail, ok } from '@/lib/http';
import { checkAdminPassword, isAdminConfigured, setAdminSessionCookie } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

const schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  try {
    if (!isAdminConfigured()) {
      return fail('Admin password is not configured. Set ADMIN_PASSWORD.', 503);
    }
    const body = schema.parse(await request.json());
    if (!checkAdminPassword(body.password)) {
      return fail('Wrong password.', 401);
    }
    await setAdminSessionCookie();
    return ok({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to log in.', 400);
  }
}
