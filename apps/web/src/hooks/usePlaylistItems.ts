import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { PlaylistItem, PlaylistItemRequirement } from "@learning-scores/shared";

export interface PlaylistItemWithId extends PlaylistItem {
  id: string;
}

export function usePlaylistItems(playlistId: string | undefined) {
  const [items, setItems] = useState<PlaylistItemWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playlistId) {
      setLoading(false);
      return;
    }
    const colRef = collection(db, "playlists", playlistId, "items");
    getDocs(colRef)
      .then((snap) => {
        const list: PlaylistItemWithId[] = snap.docs.map((d) => ({
          id: d.id,
          playlistId,
          ...d.data(),
        })) as PlaylistItemWithId[];
        list.sort((a, b) => a.order - b.order);
        setItems(list);
      })
      .finally(() => setLoading(false));
  }, [playlistId]);

  const addItem = async (data: {
    title: string;
    subtype?: string;
    author?: string;
    link?: string;
    notes?: string;
    requirement: PlaylistItemRequirement;
  }) => {
    if (!playlistId) throw new Error("No playlist selected");
    const colRef = collection(db, "playlists", playlistId, "items");
    const ref = await addDoc(colRef, {
      playlistId,
      title: data.title,
      subtype: data.subtype ?? null,
      author: data.author ?? null,
      link: data.link ?? null,
      notes: data.notes ?? null,
      requirement: data.requirement,
      order: items.length,
    });
    setItems((prev) => [
      ...prev,
      {
        id: ref.id,
        playlistId,
        title: data.title,
        subtype: data.subtype,
        author: data.author,
        link: data.link,
        notes: data.notes,
        requirement: data.requirement,
        order: items.length,
      } as PlaylistItemWithId,
    ]);
  };

  const updateItem = async (
    itemId: string,
    data: Partial<Pick<PlaylistItemWithId, "title" | "subtype" | "author" | "link" | "notes" | "requirement" | "order">>
  ) => {
    await updateDoc(doc(db, "playlists", playlistId!, "items", itemId), data);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...data } : i))
    );
  };

  const removeItem = async (itemId: string) => {
    await deleteDoc(doc(db, "playlists", playlistId!, "items", itemId));
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  return { items, loading, addItem, updateItem, removeItem };
}
