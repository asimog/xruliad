import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();

  return [
    '',
    '/pump',
    '/dashboard/streamer',
    '/dashboard/sponsor',
    '/x-overlay',
    '/pump-overlay',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path.startsWith('/dashboard') ? 'weekly' : 'daily',
    priority: path === '' ? 1 : 0.7,
  }));
}
