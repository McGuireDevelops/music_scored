import { useState, useEffect } from "react";
import type { MediaReference } from "@learning-scores/shared";
import { resolveMediaUrl } from "../../utils/mediaResolver";

interface ImageViewerProps {
  mediaRef: MediaReference;
  className?: string;
}

export function ImageViewer({ mediaRef, className }: ImageViewerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveMediaUrl(mediaRef.resourceId, mediaRef.type)
      .then(setSrc)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load image")
      );
  }, [mediaRef.resourceId, mediaRef.type]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!src) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className={className}>
      {mediaRef.label && (
        <p className="mb-2 text-sm font-medium text-gray-700">{mediaRef.label}</p>
      )}
      <img
        src={src}
        alt={mediaRef.label ?? "Lesson image"}
        className="max-w-full rounded-lg border border-gray-200"
      />
    </div>
  );
}
