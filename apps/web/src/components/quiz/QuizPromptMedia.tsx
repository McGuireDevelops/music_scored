import type { MediaReference } from "@learning-scores/shared";
import { AudioPlayer } from "../media/AudioPlayer";
import { VideoPlayer } from "../media/VideoPlayer";
import { ScoreViewer } from "../media/ScoreViewer";
import { ImageViewer } from "../media/ImageViewer";
import { DocumentViewer } from "../media/DocumentViewer";

export function QuizPromptMedia({ mediaRef }: { mediaRef?: MediaReference }) {
  if (!mediaRef) return null;
  switch (mediaRef.type) {
    case "audio":
      return (
        <div className="mb-3">
          <AudioPlayer mediaRef={mediaRef} />
        </div>
      );
    case "video":
      return (
        <div className="mb-3">
          <VideoPlayer mediaRef={mediaRef} />
        </div>
      );
    case "score":
      return (
        <div className="mb-3">
          <ScoreViewer mediaRef={mediaRef} />
        </div>
      );
    case "image":
      return (
        <div className="mb-3">
          <ImageViewer mediaRef={mediaRef} />
        </div>
      );
    case "document":
      return (
        <div className="mb-3">
          <DocumentViewer mediaRef={mediaRef} />
        </div>
      );
    default:
      return null;
  }
}
