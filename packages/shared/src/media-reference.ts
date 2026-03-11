/**
 * MediaReference system - first-class linking of audio, video, score timestamps
 * Used in lessons, feedback, assignments, rubric examples
 */

export type MediaReferenceType = "audio" | "video" | "score";

export interface MediaReference {
  type: MediaReferenceType;
  resourceId: string;
  start?: number; // seconds for audio/video
  end?: number;
  barRange?: { start: number; end: number }; // for score
  label?: string;
}

export interface MediaReferenceSet {
  refs: MediaReference[];
}

/**
 * Interface for resolving resourceId to a URL.
 * Apps (web/mobile) implement via Firebase Storage getDownloadURL or similar.
 */
export interface MediaResolver {
  resolveUrl(resourceId: string, type: MediaReferenceType): Promise<string>;
}
