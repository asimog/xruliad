"use client";

type TrackOption = {
  label: string;
  value: string;
};

type TrackControlsProps = {
  tracks: TrackOption[];
  selectedTrack: string;
  onSelectTrack: (value: string) => void;
};

export function TrackControls({
  tracks,
  selectedTrack,
  onSelectTrack,
}: TrackControlsProps) {
  return (
    <div className="music-controls-row">
      <select
        value={selectedTrack}
        onChange={(e) => onSelectTrack(e.target.value)}
        className="music-select"
      >
        {tracks.map((track) => (
          <option key={track.value} value={track.value}>
            {track.label}
          </option>
        ))}
      </select>
    </div>
  );
}
