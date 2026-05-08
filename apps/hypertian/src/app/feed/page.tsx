import { Metadata } from 'next';
import { listPublicFeed } from '@/lib/supabase/anon-queries';
import { FeedView } from '@/components/feed-view';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Feed',
  description: 'Public job cards: every ad + payment that flows through Hypertian.',
};

export default async function FeedPage() {
  const items = await listPublicFeed();
  return <FeedView initialItems={items} />;
}
