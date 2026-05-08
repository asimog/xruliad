"use client";

type UploadPanelProps = {
  onLoad: (file: File) => void;
};

export function UploadPanel({ onLoad }: UploadPanelProps) {
  return (
    <label className="music-upload">
      <span>Upload MP3</span>
      <input
        type="file"
        accept="audio/mpeg,audio/mp3,.mp3"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          onLoad(file);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}
