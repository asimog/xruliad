import { Metadata } from 'next';
import { isAdminAuthenticated, isAdminConfigured } from '@/lib/admin-session';
import { listAllAdsForAdmin, listAllStreamsForAdmin, listFeedback } from '@/lib/supabase/anon-queries';
import { AdminLogin } from '@/components/admin-login';
import { AdminDashboard, AdminAdRow, AdminFeedbackRow, AdminStreamRow } from '@/components/admin-dashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Hypertian admin moderation dashboard.',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!isAdminConfigured()) {
    return (
      <div className="panel rounded-3xl p-6">
        <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-accent)]">Admin</div>
        <h1 className="mt-1 text-2xl font-semibold text-white">Admin password not configured</h1>
        <p className="mt-2 text-sm text-[var(--color-copy-soft)]">
          Set the <code>ADMIN_PASSWORD</code> environment variable, then redeploy / restart.
        </p>
      </div>
    );
  }

  const authed = await isAdminAuthenticated();
  if (!authed) {
    return <AdminLogin />;
  }

  const [streams, ads, feedback] = await Promise.all([
    listAllStreamsForAdmin(),
    listAllAdsForAdmin(),
    listFeedback('all'),
  ]);

  return (
    <AdminDashboard
      initialStreams={streams as AdminStreamRow[]}
      initialAds={ads as AdminAdRow[]}
      initialFeedback={feedback as AdminFeedbackRow[]}
    />
  );
}
