import { ok } from '@/lib/http';
import { clearAdminSessionCookie } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export async function POST() {
  await clearAdminSessionCookie();
  return ok({ ok: true });
}
