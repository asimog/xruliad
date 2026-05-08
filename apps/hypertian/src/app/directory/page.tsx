import { Metadata } from 'next';
import { listLiveDirectoryStreams } from '@/lib/supabase/anon-queries';
import { DirectoryView } from '@/components/directory-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Directory',
  description: 'All Hypertian streams currently live, refreshed every minute via heartbeat.',
};

export default async function DirectoryPage() {
  const streams = await listLiveDirectoryStreams();
  return <DirectoryView initialStreams={streams} />;
}
