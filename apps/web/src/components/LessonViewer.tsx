import type { LessonWithId } from "../hooks/useModuleLessons";
import { AudioPlayer, VideoPlayer, ScoreViewer } from "./media";
import type { MediaReference } from "@learning-scores/shared";

interface LessonViewerProps {
  lesson: LessonWithId;
}

function MediaRefBlock({ mediaRef }: { mediaRef: MediaReference }) {
  switch (mediaRef.type) {
    case "audio":
      return <AudioPlayer mediaRef={mediaRef} />;
    case "video":
      return <VideoPlayer mediaRef={mediaRef} />;
    case "score":
      return <ScoreViewer mediaRef={mediaRef} />;
    default:
      return null;
  }
}

export function LessonViewer({ lesson }: LessonViewerProps) {
  return (
    <div style={{ maxWidth: 720 }}>
      <h3>{lesson.title}</h3>
      {lesson.content && (
        <div
          style={{ marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}
          dangerouslySetInnerHTML={{ __html: lesson.content }}
        />
      )}
      {lesson.mediaRefs?.map((mediaRef, i) => (
        <div key={i} style={{ marginBottom: "1.5rem" }}>
          <MediaRefBlock mediaRef={mediaRef} />
        </div>
      ))}
    </div>
  );
}
