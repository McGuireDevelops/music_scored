import { useState, useEffect } from "react";
import type { MediaReference } from "@learning-scores/shared";
import { resolveMediaUrl } from "../../utils/mediaResolver";

interface DocumentViewerProps {
  mediaRef: MediaReference;
  className?: string;
}

export function DocumentViewer({ mediaRef, className }: DocumentViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveMediaUrl(mediaRef.resourceId, mediaRef.type)
      .then(setUrl)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load document")
      );
  }, [mediaRef.resourceId, mediaRef.type]);

  const fileName = mediaRef.resourceId.split("/").pop() ?? "document";

  if (error) return <p className="text-red-600">{error}</p>;
  if (!url) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className={className}>
      {mediaRef.label && (
        <p className="mb-2 text-sm font-medium text-gray-700">{mediaRef.label}</p>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <span aria-hidden>📄</span>
        Download {fileName}
      </a>
    </div>
  );
}
