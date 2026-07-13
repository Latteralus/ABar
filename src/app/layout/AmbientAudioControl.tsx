import { useAudioStore } from "@/stores/audioStore";

function speakerIcon(muted: boolean, volume: number): string {
  if (muted || volume === 0) return "🔇";
  if (volume < 0.5) return "🔈";
  return "🔊";
}

export function AmbientAudioControl() {
  const volume = useAudioStore((s) => s.volume);
  const muted = useAudioStore((s) => s.muted);
  const setVolume = useAudioStore((s) => s.setVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const ensureStarted = useAudioStore((s) => s.ensureStarted);

  return (
    <div className="ambient-audio-control">
      <button
        className="ambient-audio-toggle"
        onClick={() => {
          ensureStarted();
          toggleMute();
        }}
        title={muted ? "Unmute bar ambience" : "Mute bar ambience"}
        aria-label={muted ? "Unmute bar ambience" : "Mute bar ambience"}
      >
        {speakerIcon(muted, volume)}
      </button>
      <input
        className="ambient-audio-slider"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => {
          ensureStarted();
          setVolume(Number(e.target.value));
        }}
        aria-label="Bar ambience volume"
        title="Bar ambience volume"
      />
    </div>
  );
}
