import { useState, useRef } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { storage, functions, httpsCallable } from "../firebase";
import type { LessonWithId } from "../hooks/useModuleLessons";
import type { MediaReference } from "@learning-scores/shared";

export type LessonUpdateMode = "push" | "newVersion";

interface LessonBuilderFormProps {
  lesson: LessonWithId | null;
  classId: string;
  moduleId: string;
  userId: string;
  onSave: (data: {
    title: string;
    content?: string;
    summary?: string;
    type: "video" | "audio" | "score" | "text";
    mediaRefs?: MediaReference[];
  }, updateMode?: LessonUpdateMode) => Promise<void>;
  onCancel: () => void;
  isNew: boolean;
}

const ACCEPT_VIDEO = "video/mp4,video/webm,video/ogg";
const ACCEPT_IMAGE = "image/jpeg,image/png,image/gif,image/webp";
const ACCEPT_DOCUMENT =
  "application/pdf,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx";

export function LessonBuilderForm({
  lesson,
  classId,
  moduleId,
  userId,
  onSave,
  onCancel,
  isNew,
}: LessonBuilderFormProps) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [content, setContent] = useState(lesson?.content ?? "");
  const [summary, setSummary] = useState(lesson?.summary ?? "");
  const [type, setType] = useState<"video" | "audio" | "score" | "text">(
    lesson?.type ?? "text"
  );
  const [mediaRefs, setMediaRefs] = useState<MediaReference[]>(
    lesson?.mediaRefs ?? []
  );
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const generateLessonSummary = httpsCallable<
    { lessonId?: string; title?: string; content?: string },
    { summary: string }
  >(functions, "generateLessonSummary");

  const handleAiSummary = async () => {
    setAiLoading(true);
    try {
      const res = await generateLessonSummary(
        lesson
          ? { lessonId: lesson.id }
          : { title, content }
      );
      if (res.data?.summary) setSummary(res.data.summary);
    } catch (err) {
      console.error("AI summary error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const uploadFile = async (
    file: File,
    mediaType: "video" | "image" | "document"
  ): Promise<string> => {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `classes/${classId}/media/${Date.now()}-${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return path;
  };

  const handleSave = async (e: React.FormEvent, updateMode?: LessonUpdateMode) => {
    if (e && "preventDefault" in e) e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const newRefs: MediaReference[] = [...mediaRefs];

      if (videoFile) {
        const path = await uploadFile(videoFile, "video");
        newRefs.push({ type: "video", resourceId: path });
      }

      for (const img of imageFiles) {
        const path = await uploadFile(img, "image");
        newRefs.push({ type: "image", resourceId: path });
      }

      for (const doc of documentFiles) {
        const path = await uploadFile(doc, "document");
        newRefs.push({ type: "document", resourceId: path });
      }

      await onSave({
        title: title.trim(),
        content: content.trim() || undefined,
        summary: summary.trim() || undefined,
        type,
        mediaRefs: newRefs.length > 0 ? newRefs : undefined,
      }, updateMode);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const removeMediaRef = (index: number) => {
    setMediaRefs((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave(e, isNew ? undefined : "push");
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Lesson title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Welcome to Scoring 101"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Lesson text
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="Main lesson content..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Lesson video (optional)
        </label>
        <input
          ref={videoInputRef}
          type="file"
          accept={ACCEPT_VIDEO}
          className="hidden"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {videoFile ? videoFile.name : "Choose video"}
          </button>
          {mediaRefs.filter((r) => r.type === "video").length > 0 && (
            <span className="py-2 text-sm text-gray-500">
              + {mediaRefs.filter((r) => r.type === "video").length} existing
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Lesson images (optional)
        </label>
        <input
          ref={imageInputRef}
          type="file"
          accept={ACCEPT_IMAGE}
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            setImageFiles((prev) => [...prev, ...files]);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Add images
          </button>
          {imageFiles.length > 0 && (
            <span className="py-2 text-sm text-gray-500">
              {imageFiles.length} selected
            </span>
          )}
          {mediaRefs.filter((r) => r.type === "image").length > 0 && (
            <span className="py-2 text-sm text-gray-500">
              + {mediaRefs.filter((r) => r.type === "image").length} existing
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Documents – PDF, Word (optional)
        </label>
        <input
          ref={documentInputRef}
          type="file"
          accept={ACCEPT_DOCUMENT}
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            setDocumentFiles((prev) => [...prev, ...files]);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => documentInputRef.current?.click()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Add PDF or Word
          </button>
          {documentFiles.length > 0 && (
            <span className="py-2 text-sm text-gray-500">
              {documentFiles.length} selected
            </span>
          )}
          {mediaRefs.filter((r) => r.type === "document").length > 0 && (
            <span className="py-2 text-sm text-gray-500">
              + {mediaRefs.filter((r) => r.type === "document").length} existing
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Summary
        </label>
        <div className="flex gap-2">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            placeholder="Short summary for students (or use AI to generate)"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleAiSummary}
            disabled={aiLoading || (!title && !content)}
            className="shrink-0 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiLoading ? "Generating…" : "Use AI"}
          </button>
        </div>
      </div>

      {mediaRefs.length > 0 && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Current media (click to remove)
          </label>
          <div className="flex flex-wrap gap-2">
            {mediaRefs.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => removeMediaRef(i)}
                className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:bg-red-50 hover:text-red-700"
              >
                {r.type}: {r.resourceId.split("/").pop()} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        {isNew ? (
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add lesson"}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                handleSave(e as unknown as React.FormEvent, "push");
              }}
              className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & push to attached"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                handleSave(e as unknown as React.FormEvent, "newVersion");
              }}
              className="rounded-xl border border-primary bg-white px-5 py-2.5 font-medium text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save as new version"}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
