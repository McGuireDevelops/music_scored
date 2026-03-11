import { useState, useEffect } from "react";
import type { MediaReference } from "@learning-scores/shared";
import { resolveMediaUrl } from "../../utils/mediaResolver";

/**
 * Score viewer placeholder.
 * Displays score media (PDF or image) at optional bar range.
 * Full implementation: integrate Verovio, AlphaTex, or PDF + overlay layer.
 */
interface ScoreViewerProps {
  mediaRef: MediaReference;
  className?: string;
}

export function ScoreViewer({ mediaRef, className }: ScoreViewerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveMediaUrl(mediaRef.resourceId, mediaRef.type)
      .then(setSrc)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load score")
      );
  }, [mediaRef.resourceId, mediaRef.type]);

  if (error) return <p style={{ color: "#c00" }}>{error}</p>;
  if (!src)
    return <p>Loading score…</p>;

  const isPdf = mediaRef.resourceId.toLowerCase().endsWith(".pdf");

  return (
    <div className={className}>
      {mediaRef.label && <p style={{ marginBottom: "0.5rem" }}>{mediaRef.label}</p>}
      {mediaRef.barRange && (
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          Bars {mediaRef.barRange.start}–{mediaRef.barRange.end}
        </p>
      )}
      {isPdf ? (
        <iframe
          src={src}
          title="Score"
          style={{ width: "100%", height: 480, border: "1px solid #ccc" }}
        />
      ) : (
        <img
          src={src}
          alt="Score"
          style={{ maxWidth: "100%", height: "auto" }}
        />
      )}
    </div>
  );
}
