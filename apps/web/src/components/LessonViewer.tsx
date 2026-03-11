import DOMPurify from "dompurify";
import type { LessonWithId } from "../hooks/useModuleLessons";
import { AudioPlayer, VideoPlayer, ScoreViewer, ImageViewer } from "./media";
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
    case "image":
      return <ImageViewer mediaRef={mediaRef} />;
    default:
      return null;
  }
}

export function LessonViewer({ lesson }: LessonViewerProps) {
  return (
    <div className="max-w-3xl">
      <h3 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">
        {lesson.title}
      </h3>
      {lesson.summary && (
        <p className="mb-4 text-sm italic text-gray-600">{lesson.summary}</p>
      )}
      {lesson.content && (
        <div
          className="mb-6 max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(lesson.content, {
              ALLOWED_TAGS: ["p", "b", "i", "u", "em", "strong", "a", "br", "ul", "ol", "li"],
              ALLOWED_ATTR: ["href", "target", "rel"],
            }),
          }}
        />
      )}
      {lesson.mediaRefs?.map((mediaRef, i) => (
        <div key={i} className="mb-6 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
          <MediaRefBlock mediaRef={mediaRef} />
        </div>
      ))}
    </div>
  );
}
