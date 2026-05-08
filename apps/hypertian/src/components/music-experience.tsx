'use client';

import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Disc3, Pause, Play, SkipBack, SkipForward, Upload } from 'lucide-react';
import { useMusic, type AudioFeatures } from '@/components/music-provider';
import { drawCentralOrb, drawOrbLightRays, type OrbRay } from '@/components/orb-renderer';

export function MusicExperience() {
  const music = useMusic();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const featuresRef = useRef(music.features);
  const raysRef = useRef<OrbRay[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    featuresRef.current = music.features;
  }, [music.features]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const drawingContext = canvasElement.getContext('2d');
    if (!drawingContext) return;
    const canvas: HTMLCanvasElement = canvasElement;
    const ctx: CanvasRenderingContext2D = drawingContext;

    let raf = 0;
    let time = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

     let lastTime = 0;

     function draw(now: number) {
       const dt = (now - lastTime) / 1000;
       lastTime = now;
       time += 0.016;
       const width = canvas.clientWidth;
       const height = canvas.clientHeight;
       const cx = width / 2;
       const cy = height / 2;
       const audio = featuresRef.current;
       const energy = audio.isPlaying ? audio.volume : 0.08;
       const bass = audio.isPlaying ? audio.bass : 0.06;
       const radius = Math.min(width, height) * (0.18 + bass * 0.085 + energy * 0.022);

       ctx.clearRect(0, 0, width, height);

       const sky = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.8);
       sky.addColorStop(0, `rgba(124, 228, 210, ${0.12 + energy * 0.12})`);
       sky.addColorStop(0.44, `rgba(134, 182, 255, ${0.08 + audio.high * 0.14})`);
       sky.addColorStop(1, 'rgba(0, 0, 0, 0)');
       ctx.fillStyle = sky;
       ctx.beginPath();
       ctx.arc(cx, cy, radius * 2.8, 0, Math.PI * 2);
       ctx.fill();

       for (let ring = 0; ring < 3; ring += 1) {
         const ringRadius = radius * (1.42 + ring * 0.34 + energy * 0.12);
         ctx.strokeStyle = `rgba(124, 228, 210, ${0.13 - ring * 0.03 + audio.mid * 0.08})`;
         ctx.lineWidth = 1;
         ctx.beginPath();
         for (let i = 0; i <= 220; i += 1) {
           const angle = (i / 220) * Math.PI * 2;
           const wobble = Math.sin(angle * 5 + time * (1.5 + ring) + ring) * radius * 0.025 * (1 + audio.high);
           const x = cx + Math.cos(angle) * (ringRadius + wobble);
           const y = cy + Math.sin(angle) * (ringRadius * 0.34 + wobble * 0.5);
           if (i === 0) ctx.moveTo(x, y);
           else ctx.lineTo(x, y);
         }
         ctx.closePath();
         ctx.stroke();
       }

       if (energy > 0.2) {
         const spawnCount = Math.ceil(energy * 3);
         for (let s = 0; s < spawnCount; s += 1) {
           const newRay = {
             angle: Math.random() * Math.PI * 2,
             speed: 1.8 + Math.random() * 2.8 + energy * 2.2,
             length: 120 + Math.random() * 240 + energy * 180,
             width: 0.8 + Math.random() * 2.4 + energy * 1.6,
             life: 260 + Math.random() * 220,
             maxLife: 480,
             hue: Math.random(),
             jitter: (Math.random() - 0.5) * 0.32,
           };
           raysRef.current.push(newRay);
         }
       }

       drawCentralOrb(ctx, width, height, audio, now);
       drawOrbLightRays(ctx, width, height, now, dt, audio, raysRef.current);

       raf = requestAnimationFrame(draw);
     }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  async function upload(file: File | null) {
    if (!file) return;
    setLocalError(null);
    try {
      await music.addUploadedTrack(file);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'MP3 upload failed.');
    }
  }

  async function submitYouTube(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    try {
      await music.loadYouTube(youtubeUrl);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'YouTube audio failed.');
    }
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    void upload(file);
    event.currentTarget.value = '';
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDropActive(false);
    void upload(event.dataTransfer.files?.[0] ?? null);
  }

  const message = localError || music.error || music.status;

  return (
    <div className="music-page grid gap-6">
      <section className="music-stage panel overflow-hidden rounded-3xl">
        <canvas ref={canvasRef} aria-label="Audio reactive orb visualizer" className="music-canvas" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel rounded-3xl p-5">
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-accent)]">Music</div>
            <h1 className="mt-1 max-w-xl text-3xl font-semibold text-white md:text-5xl">Reactive audio sphere</h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--color-copy-soft)]">
              Play the local playlist, drop in MP3s, or stream YouTube audio while the glowing orb reacts live.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">Now playing</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {music.sourceKind === 'youtube' ? 'YouTube audio' : music.selectedTrack?.label ?? 'No track selected'}
              </div>
            </div>
            <span className="pill">{music.isPlaying ? 'Audio live' : 'Paused'}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Music transport controls">
            <button className="secondary-button" onClick={() => void music.previous()} type="button" aria-label="Previous track">
              <SkipBack aria-hidden className="h-4 w-4" />
            </button>
            <button className="primary-button min-w-32" onClick={() => void music.toggle()} type="button">
              {music.isPlaying ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
              {music.isPlaying ? 'Pause' : 'Play'}
            </button>
            <button className="secondary-button" onClick={() => void music.next()} type="button" aria-label="Next track">
              <SkipForward aria-hidden className="h-4 w-4" />
            </button>
          </div>

          <label className="mt-4 grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]" htmlFor="music-track">
            MP3 playlist
            <select
              className="field"
              id="music-track"
              onChange={(event) => {
                music.setSelectedTrackId(event.target.value);
                void music.playTrack(event.target.value);
              }}
              value={music.selectedTrackId}
            >
              {music.tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="panel rounded-3xl p-5">
          <form className="grid gap-2" onSubmit={submitYouTube}>
            <label className="grid gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--color-copy-faint)]" htmlFor="music-youtube">
              YouTube video or playlist
              <input
                autoComplete="url"
                className="field"
                id="music-youtube"
                inputMode="url"
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                type="url"
                value={youtubeUrl}
              />
            </label>
            <button className="primary-button justify-center" disabled={!youtubeUrl.trim()} type="submit">
              <Disc3 aria-hidden className="h-4 w-4" />
              Load YouTube
            </button>
          </form>

          <label
            className={`music-dropzone mt-4 ${dropActive ? 'is-active' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setDropActive(false);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <input accept="audio/mpeg,audio/mp3,.mp3" className="sr-only" onChange={onFileInput} type="file" />
            <Upload aria-hidden className="h-5 w-5 text-[var(--color-accent)]" />
            <span>Drop MP3 or click to browse</span>
          </label>

          <div className={`status-note mt-4 ${localError || music.error ? '' : ''}`} data-tone={localError || music.error ? 'danger' : 'success'}>
            {message}
          </div>
        </div>
      </section>
    </div>
  );
}
