import { useState, useEffect } from "react";
import type { MediaReference } from "@learning-scores/shared";
import { resolveMediaUrl } from "../../utils/mediaResolver";

/**
 * Score viewer placeholder.
 * Displays score media (PDF or image) at optional bar range.
 * Full implementation: integrate Verovio, AlphaTex, or PDF + overlay layer.
 */
function scoreUrlWithPage(base: string, page?: number): string {
  if (page == null || page < 1) return base;
  const withoutHash = base.split("#")[0] ?? base;
  return `${withoutHash}#page=${page}`;
}

interface ScoreViewerProps {
  mediaRef: MediaReference;
  className?: string;
  /** Overrides `mediaRef.pdfPage` for presenter presets */
  pdfPage?: number;
  /** Fill parent height (split layouts / fullscreen presenter) */
  fill?: boolean;
}

export function ScoreViewer({
  mediaRef,
  className,
  pdfPage: pdfPageProp,
  fill = false,
}: ScoreViewerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const effectivePage = pdfPageProp ?? mediaRef.pdfPage;

  useEffect(() => {
    resolveMediaUrl(mediaRef.resourceId, mediaRef.type)
      .then((url) => setSrc(scoreUrlWithPage(url, effectivePage)))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load score")
      );
  }, [mediaRef.resourceId, mediaRef.type, effectivePage]);

  if (error) return <p style={{ color: "#c00" }}>{error}</p>;
  if (!src)
    return <p>Loading score…</p>;

  const isPdf = mediaRef.resourceId.toLowerCase().endsWith(".pdf");

  const meta = !fill && (
    <>
      {mediaRef.label && <p style={{ marginBottom: "0.5rem" }}>{mediaRef.label}</p>}
      {mediaRef.barRange && (
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          Bars {mediaRef.barRange.start}–{mediaRef.barRange.end}
        </p>
      )}
    </>
  );

  const shellClass = fill
    ? `${className ?? ""} flex min-h-0 min-w-0 flex-1 flex-col`.trim()
    : (className ?? "");

  return (
    <div className={shellClass}>
      {meta}
      {isPdf ? (
        <iframe
          src={src}
          title="Score"
          className={fill ? "min-h-0 w-full flex-1 border border-gray-200" : undefined}
          style={
            fill
              ? undefined
              : { width: "100%", height: 480, border: "1px solid #ccc" }
          }
        />
      ) : (
        <img
          src={src}
          alt="Score"
          className={
            fill ? "mx-auto max-h-full max-w-full object-contain" : undefined
          }
          style={fill ? undefined : { maxWidth: "100%", height: "auto" }}
        />
      )}
    </div>
  );
}
