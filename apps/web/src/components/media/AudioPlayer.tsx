import { useRef, useEffect, useState } from "react";
import type { MediaReference } from "@learning-scores/shared";
import { resolveMediaUrl } from "../../utils/mediaResolver";

interface AudioPlayerProps {
  mediaRef: MediaReference;
  className?: string;
}

export function AudioPlayer({ mediaRef, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveMediaUrl(mediaRef.resourceId, mediaRef.type)
      .then(setSrc)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load audio")
      );
  }, [mediaRef.resourceId, mediaRef.type]);

  useEffect(() => {
    if (!audioRef.current || !src || mediaRef.type !== "audio") return;
    const audio = audioRef.current;
    const handleLoadedMetadata = () => {
      if (mediaRef.start != null) {
        audio.currentTime = mediaRef.start;
      }
    };
    const handleTimeUpdate = () => {
      if (mediaRef.end != null && audio.currentTime >= mediaRef.end) {
        audio.pause();
      }
    };
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [src, mediaRef.start, mediaRef.end, mediaRef.type]);

  if (error) return <p style={{ color: "#c00" }}>{error}</p>;
  if (!src) return <p>Loading audio…</p>;

  return (
    <div className={className}>
      {mediaRef.label && <p style={{ marginBottom: "0.5rem" }}>{mediaRef.label}</p>}
      <audio
        ref={audioRef}
        src={src}
        controls
        style={{ width: "100%", maxWidth: 400 }}
      />
    </div>
  );
}
