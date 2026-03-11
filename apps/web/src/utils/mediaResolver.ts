import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "../firebase";
import type { MediaReferenceType } from "@learning-scores/shared";

/**
 * Resolve resourceId to a Storage URL.
 * Assumes resourceId is a Storage path (e.g. classes/{classId}/media/audio.mp3)
 */
export async function resolveMediaUrl(
  resourceId: string,
  _type: MediaReferenceType
): Promise<string> {
  const storageRef = ref(storage, resourceId);
  return getDownloadURL(storageRef);
}
