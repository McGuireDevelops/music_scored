import { useRef, useEffect, useState } from "react";
import type { MediaReference } from "@learning-scores/shared";
import { resolveMediaUrl } from "../../utils/mediaResolver";

interface VideoPlayerProps {
  mediaRef: MediaReference;
  className?: string;
}

export function VideoPlayer({ mediaRef, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveMediaUrl(mediaRef.resourceId, mediaRef.type)
      .then(setSrc)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load video")
      );
  }, [mediaRef.resourceId, mediaRef.type]);

  useEffect(() => {
    if (!videoRef.current || !src || mediaRef.type !== "video") return;
    const video = videoRef.current;
    const handleLoadedMetadata = () => {
      if (mediaRef.start != null) {
        video.currentTime = mediaRef.start;
      }
    };
    const handleTimeUpdate = () => {
      if (mediaRef.end != null && video.currentTime >= mediaRef.end) {
        video.pause();
      }
    };
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [src, mediaRef.start, mediaRef.end, mediaRef.type]);

  if (error) return <p style={{ color: "#c00" }}>{error}</p>;
  if (!src) return <p>Loading video…</p>;

  return (
    <div className={className}>
      {mediaRef.label && <p style={{ marginBottom: "0.5rem" }}>{mediaRef.label}</p>}
      <video
        ref={videoRef}
        src={src}
        controls
        style={{ width: "100%", maxWidth: 640 }}
      />
    </div>
  );
}
