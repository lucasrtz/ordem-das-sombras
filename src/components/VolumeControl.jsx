import { useEffect, useState } from "react";
import { getAudio, setAudio, subscribeAudio, canPlayOgg } from "../lib/audio.js";

export default function VolumeControl() {
  const [a, setA] = useState(getAudio);
  useEffect(() => subscribeAudio(setA), []);
  const silent = a.muted || a.volume === 0;

  return (
    <div className="volume" title={canPlayOgg ? "Volume" : "Este navegador não toca os sons do client (.ogg)"}>
      <button
        className="icon-btn"
        aria-label={silent ? "Ativar som" : "Silenciar"}
        aria-pressed={silent}
        onClick={() => setAudio(a.volume === 0 ? { volume: 0.5, muted: false } : { muted: !a.muted })}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
          {silent ? (
            <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
        </svg>
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={a.muted ? 0 : a.volume}
        aria-label="Volume"
        onChange={(e) => setAudio({ volume: +e.target.value, muted: false })}
      />
    </div>
  );
}
