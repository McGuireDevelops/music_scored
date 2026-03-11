import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { PlaylistProgressStatus } from "@learning-scores/shared";

function progressDocId(playlistId: string, playlistItemId: string): string {
  return `${playlistId}_${playlistItemId}`;
}

export interface PlaylistItemProgressDoc {
  playlistId: string;
  playlistItemId: string;
  classId: string;
  status: PlaylistProgressStatus;
  addedToDoAt?: number;
  updatedAt: number;
}

export function usePlaylistProgress(userId: string | undefined) {
  const [progressMap, setProgressMap] = useState<
    Record<string, PlaylistItemProgressDoc>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const colRef = collection(db, "users", userId, "playlistItemProgress");
    getDocs(colRef)
      .then((snap) => {
        const map: Record<string, PlaylistItemProgressDoc> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          const key = progressDocId(data.playlistId, data.playlistItemId);
          map[key] = { ...data } as PlaylistItemProgressDoc;
        });
        setProgressMap(map);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const getStatus = (
    playlistId: string,
    playlistItemId: string
  ): PlaylistItemProgressDoc | undefined => {
    return progressMap[progressDocId(playlistId, playlistItemId)];
  };

  const addToDoList = async (
    playlistId: string,
    playlistItemId: string,
    classId: string
  ) => {
    if (!userId) throw new Error("Not authenticated");
    const docId = progressDocId(playlistId, playlistItemId);
    const now = Date.now();
    const ref = doc(db, "users", userId, "playlistItemProgress", docId);
    await setDoc(ref, {
      playlistId,
      playlistItemId,
      classId,
      status: "todo",
      addedToDoAt: now,
      updatedAt: now,
    });
    setProgressMap((prev) => ({
      ...prev,
      [docId]: {
        playlistId,
        playlistItemId,
        classId,
        status: "todo",
        addedToDoAt: now,
        updatedAt: now,
      },
    }));
  };

  const setStatus = async (
    playlistId: string,
    playlistItemId: string,
    classId: string,
    status: PlaylistProgressStatus
  ) => {
    if (!userId) throw new Error("Not authenticated");
    const docId = progressDocId(playlistId, playlistItemId);
    const now = Date.now();
    const ref = doc(db, "users", userId, "playlistItemProgress", docId);
    const existing = progressMap[docId];
    await setDoc(ref, {
      playlistId,
      playlistItemId,
      classId,
      status,
      addedToDoAt: existing?.addedToDoAt ?? now,
      updatedAt: now,
    });
    setProgressMap((prev) => ({
      ...prev,
      [docId]: {
        playlistId,
        playlistItemId,
        classId,
        status,
        addedToDoAt: existing?.addedToDoAt ?? now,
        updatedAt: now,
      },
    }));
  };

  const removeFromDoList = async (
    playlistId: string,
    playlistItemId: string
  ) => {
    if (!userId) throw new Error("Not authenticated");
    const docId = progressDocId(playlistId, playlistItemId);
    const ref = doc(db, "users", userId, "playlistItemProgress", docId);
    await deleteDoc(ref);
    setProgressMap((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  };

  return {
    progressMap,
    loading,
    getStatus,
    addToDoList,
    setStatus,
    removeFromDoList,
  };
}
