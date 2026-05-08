"use client";

import { useVisualBackground } from "@/lib/ui/visual-background-provider";

export function GlobalBackgroundToggle() {
  const { backgroundEnabled, toggleBackgroundEnabled } = useVisualBackground();

  return (
    <button
      type="button"
      className={`background-toggle-btn${backgroundEnabled ? "" : " is-off"}`}
      onClick={toggleBackgroundEnabled}
      aria-label={
        backgroundEnabled
          ? "Turn off animated background"
          : "Turn on animated background"
      }
      title={
        backgroundEnabled
          ? "Turn off animated background"
          : "Turn on animated background"
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.5 12c1.9-3.4 4.8-5.1 7.5-5.1s5.6 1.7 7.5 5.1c-1.9 3.4-4.8 5.1-7.5 5.1S6.4 15.4 4.5 12Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="2.9"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        {!backgroundEnabled ? (
          <path
            d="M5 5l14 14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </button>
  );
}
