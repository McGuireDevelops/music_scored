import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { getPermissionErrorMessage, isFirebasePermissionError } from "../utils/firebaseErrors";
import type { Playlist, PlaylistType } from "@learning-scores/shared";

export interface PlaylistWithId extends Playlist {
  id: string;
}

export function usePlaylists(classId: string | undefined) {
  const [playlists, setPlaylists] = useState<PlaylistWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "playlists"),
      where("classId", "==", classId)
    );
    getDocs(q)
      .then((snap) => {
        const list: PlaylistWithId[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as PlaylistWithId[];
        list.sort((a, b) => a.order - b.order);
        setPlaylists(list);
      })
      .catch((err) => {
        if (isFirebasePermissionError(err)) {
          setError(getPermissionErrorMessage(err, "Failed to load playlists"));
        } else {
          setError(err instanceof Error ? err.message : "Failed to load playlists");
        }
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const createPlaylist = async (data: {
    ownerId: string;
    type: PlaylistType;
    name: string;
    description?: string;
  }) => {
    if (!classId) throw new Error("No class selected");
    const now = Date.now();
    const ref = await addDoc(collection(db, "playlists"), {
      classId,
      ownerId: data.ownerId,
      type: data.type,
      name: data.name,
      description: data.description ?? null,
      order: playlists.length,
      createdAt: now,
      updatedAt: now,
    });
    setPlaylists((prev) => [
      ...prev,
      {
        id: ref.id,
        classId,
        ownerId: data.ownerId,
        type: data.type,
        name: data.name,
        description: data.description,
        order: playlists.length,
        createdAt: now,
        updatedAt: now,
      } as PlaylistWithId,
    ]);
    return ref.id;
  };

  const updatePlaylist = async (
    playlistId: string,
    data: Partial<Pick<PlaylistWithId, "name" | "description" | "order">>
  ) => {
    await updateDoc(doc(db, "playlists", playlistId), {
      ...data,
      updatedAt: Date.now(),
    });
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId ? { ...p, ...data, updatedAt: Date.now() } : p
      )
    );
  };

  const deletePlaylist = async (playlistId: string) => {
    await deleteDoc(doc(db, "playlists", playlistId));
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  };

  return {
    playlists,
    loading,
    error,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
  };
}
