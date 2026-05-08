"use client";

type WinampMiniPlayerProps = {
  title: string;
  playing: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  onTogglePlayback: () => void;
  onRandomize: () => void;
};

export function WinampMiniPlayer({
  title,
  playing,
  onPrev,
  onNext,
  onSeekBack,
  onSeekForward,
  onTogglePlayback,
  onRandomize,
}: WinampMiniPlayerProps) {
  return (
    <div className="winamp-mini">
      <div className="winamp-title">{title}</div>
      <div className="winamp-controls">
        <button type="button" onClick={onPrev} aria-label="Previous track">
          «
        </button>
        <button type="button" onClick={onSeekBack} aria-label="Seek backward 10 seconds">
          -10
        </button>
        <button type="button" onClick={onTogglePlayback} aria-label="Play or pause">
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={onSeekForward} aria-label="Seek forward 10 seconds">
          +10
        </button>
        <button type="button" onClick={onNext} aria-label="Next track">
          »
        </button>
        <button type="button" onClick={onRandomize} aria-label="Randomize visuals and simulation">
          ⚄
        </button>
      </div>
    </div>
  );
}
