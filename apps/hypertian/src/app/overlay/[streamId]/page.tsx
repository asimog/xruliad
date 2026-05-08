'use client';

import OverlaySurface from '@/components/OverlaySurface';
import { useParams, useSearchParams } from 'next/navigation';

export default function StreamOverlayPage() {
  const params = useParams<{ streamId: string }>();
  const searchParams = useSearchParams();
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.set('stream', params.streamId);

  return <OverlaySurface platform="x" searchParams={nextParams} />;
}
