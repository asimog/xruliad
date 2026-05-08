import { Metadata } from 'next';
import { MusicExperience } from '@/components/music-experience';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Music',
  description: 'Play Hypertian music with local MP3, upload, YouTube, and an audio-reactive orb visualizer.',
};

export default function MusicPage() {
  return <MusicExperience />;
}
