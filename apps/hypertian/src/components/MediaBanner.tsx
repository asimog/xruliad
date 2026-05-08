/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { FALLBACK_STREAM_BANNER_URL } from '@/lib/constants';

interface MediaBannerProps {
  src?: string | null;
  type?: 'image' | 'gif' | 'video' | null;
  title?: string;
}

export default function MediaBanner({ src, type, title = 'Approved Media Banner' }: MediaBannerProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  if (!src || !type) {
    return null;
  }

  if (type === 'video') {
    return (
      <div className="h-56 w-80 overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/90 backdrop-blur-xl">
        <video autoPlay className="h-full w-full object-cover" loop muted playsInline src={src} />
      </div>
    );
  }

  return (
    <div className="h-56 w-80 overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/90 backdrop-blur-xl">
      <img
        alt={title}
        className="h-full w-full object-cover"
        onError={() => {
          if (currentSrc !== FALLBACK_STREAM_BANNER_URL) {
            setCurrentSrc(FALLBACK_STREAM_BANNER_URL);
          }
        }}
        src={currentSrc || FALLBACK_STREAM_BANNER_URL}
      />
    </div>
  );
}
