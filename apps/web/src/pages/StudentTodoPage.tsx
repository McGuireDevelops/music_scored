import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { usePlaylistProgress } from "../hooks/usePlaylistProgress";
import type { PlaylistProgressStatus } from "@learning-scores/shared";

interface TodoItem {
  playlistId: string;
  playlistItemId: string;
  classId: string;
  className: string;
  playlistName: string;
  itemTitle: string;
  requirement: "mandatory" | "recommended";
  status: PlaylistProgressStatus;
}

function progressDocId(playlistId: string, playlistItemId: string): string {
  return `${playlistId}_${playlistItemId}`;
}

export default function StudentTodoPage() {
  const { user } = useAuth();
  const { progressMap, loading: progressLoading, setStatus, removeFromDoList } =
    usePlaylistProgress(user?.uid);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || progressLoading) return;
    const progresses = Object.values(progressMap).filter(
      (p) => p.status !== "done"
    );
    if (progresses.length === 0) {
      setTodoItems([]);
      setLoading(false);
      return;
    }
    const loadItems = async () => {
      const items: TodoItem[] = [];
      for (const p of progresses) {
        try {
          const [playlistSnap, itemSnap, classSnap] = await Promise.all([
            getDoc(doc(db, "playlists", p.playlistId)),
            getDoc(doc(db, "playlists", p.playlistId, "items", p.playlistItemId)),
            getDoc(doc(db, "classes", p.classId)),
          ]);
          if (!playlistSnap.exists() || !itemSnap.exists() || !classSnap.exists())
            continue;
          const playlistData = playlistSnap.data();
          const itemData = itemSnap.data();
          items.push({
            playlistId: p.playlistId,
            playlistItemId: p.playlistItemId,
            classId: p.classId,
            className: classSnap.data()?.name ?? "Class",
            playlistName: playlistData?.name ?? "Playlist",
            itemTitle: itemData?.title ?? "Item",
            requirement: itemData?.requirement ?? "recommended",
            status: p.status,
          });
        } catch {
          // skip failed lookups
        }
      }
      setTodoItems(items);
    };
    loadItems().finally(() => setLoading(false));
  }, [user?.uid, progressMap, progressLoading]);

  const handleStatusChange = async (
    playlistId: string,
    playlistItemId: string,
    classId: string,
    status: PlaylistProgressStatus
  ) => {
    await setStatus(playlistId, playlistItemId, classId, status);
  };

  const handleRemove = async (playlistId: string, playlistItemId: string) => {
    await removeFromDoList(playlistId, playlistItemId);
  };

  return (
    <ProtectedRoute requiredRole="student">
      <div>
        <Link
          to="/student"
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
          My to-do list
        </h1>
        <p className="mb-6 text-gray-600">
          Playlist items you have added from your classes
        </p>
        {(loading || progressLoading) && (
          <p className="text-gray-500">Loading…</p>
        )}
        {!loading && !progressLoading && todoItems.length === 0 && (
          <div className="rounded-card border border-gray-200 bg-white p-8 text-center shadow-card">
            <p className="text-gray-600">
              No items in your to-do list. Add playlist items from your classes.
            </p>
            <Link
              to="/student"
              className="mt-4 inline-block font-medium text-primary no-underline hover:underline"
            >
              Go to classes →
            </Link>
          </div>
        )}
        {!loading && !progressLoading && todoItems.length > 0 && (
          <div className="space-y-4">
            {todoItems.map((item) => (
              <div
                key={progressDocId(item.playlistId, item.playlistItemId)}
                className="rounded-card flex flex-wrap items-center justify-between gap-4 border border-gray-200 bg-white p-4 shadow-card"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.itemTitle}</p>
                  <p className="text-sm text-gray-600">
                    {item.playlistName} · {item.className}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      item.requirement === "mandatory"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.requirement}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={item.status}
                    onChange={(e) =>
                      handleStatusChange(
                        item.playlistId,
                        item.playlistItemId,
                        item.classId,
                        e.target.value as PlaylistProgressStatus
                      )
                    }
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      handleRemove(item.playlistId, item.playlistItemId)
                    }
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    Remove
                  </button>
                  <Link
                    to={`/student/class/${item.classId}`}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white no-underline transition-colors hover:bg-primary-dark"
                  >
                    Open class
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
