import { fail, ok } from '@/lib/http';
import { isAdminAuthenticated } from '@/lib/admin-session';
import {
  listAllAdsForAdmin,
  listAllStreamsForAdmin,
  listFeedback,
} from '@/lib/supabase/anon-queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return fail('Unauthorized.', 401);
  }

  try {
    const [streams, ads, feedback] = await Promise.all([
      listAllStreamsForAdmin(),
      listAllAdsForAdmin(),
      listFeedback('all'),
    ]);
    return ok(
      { streams, ads, feedback },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load admin data.');
  }
}
