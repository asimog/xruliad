import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getPublicFeedItem } from '@/lib/supabase/anon-queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ adId: string }> }
) {
  const { adId } = await params;
  const item = await getPublicFeedItem(adId);

  if (!item) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ item });
}
