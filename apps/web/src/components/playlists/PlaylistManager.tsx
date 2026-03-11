import { useState } from "react";
import { usePlaylists } from "../../hooks/usePlaylists";
import { usePlaylistItems } from "../../hooks/usePlaylistItems";
import type {
  PlaylistType,
  PlaylistItemRequirement,
} from "@learning-scores/shared";
import type { PlaylistWithId } from "../../hooks/usePlaylists";
import type { PlaylistItemWithId } from "../../hooks/usePlaylistItems";
import type { PlaylistItemProgressDoc } from "../../hooks/usePlaylistProgress";

const PLAYLIST_TYPES: { value: PlaylistType; label: string }[] = [
  { value: "reading", label: "Reading list" },
  { value: "watch", label: "Watch list" },
  { value: "game", label: "Game list" },
  { value: "music", label: "Music & scores" },
];

interface PlaylistProgressHandlers {
  getStatus: (playlistId: string, playlistItemId: string) => PlaylistItemProgressDoc | undefined;
  addToDoList: (playlistId: string, playlistItemId: string, classId: string) => Promise<void>;
  setStatus: (
    playlistId: string,
    playlistItemId: string,
    classId: string,
    status: "todo" | "in_progress" | "done"
  ) => Promise<void>;
  removeFromDoList: (playlistId: string, playlistItemId: string) => Promise<void>;
}

export function PlaylistManager({
  classId,
  isTeacher,
  ownerId,
  progressHandlers,
}: {
  classId: string;
  isTeacher: boolean;
  ownerId: string;
  progressHandlers?: PlaylistProgressHandlers;
}) {
  const {
    playlists,
    loading,
    error,
    createPlaylist,
    deletePlaylist,
  } = usePlaylists(classId);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistWithId | null>(
    null
  );
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistType, setNewPlaylistType] = useState<PlaylistType>("reading");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setCreating(true);
    try {
      await createPlaylist({
        ownerId,
        type: newPlaylistType,
        name: newPlaylistName.trim(),
      });
      setNewPlaylistName("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 shrink-0 lg:w-64">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Playlists</h3>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && playlists.length === 0 && (
          <p className="text-sm text-gray-600">No playlists yet.</p>
        )}
        {!loading && playlists.length > 0 && (
          <nav className="space-y-0.5">
            {playlists.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlaylist(p)}
                className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  selectedPlaylist?.id === p.id
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="capitalize">{p.type}</span>: {p.name}
              </button>
            ))}
          </nav>
        )}
        {isTeacher && (
          <form onSubmit={handleCreate} className="mt-4">
            <input
              type="text"
              placeholder="New playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={newPlaylistType}
              onChange={(e) => setNewPlaylistType(e.target.value as PlaylistType)}
              className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PLAYLIST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creating || !newPlaylistName.trim()}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating…" : "Add playlist"}
            </button>
          </form>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {selectedPlaylist ? (
          <PlaylistItemsList
            playlist={selectedPlaylist}
            classId={classId}
            isTeacher={isTeacher}
            progressHandlers={progressHandlers}
            onDelete={deletePlaylist}
            onBack={() => setSelectedPlaylist(null)}
          />
        ) : (
          <p className="text-gray-600">Select a playlist to view its items.</p>
        )}
      </div>
    </div>
  );
}

function PlaylistItemsList({
  playlist,
  classId,
  isTeacher,
  progressHandlers,
  onDelete,
  onBack,
}: {
  playlist: PlaylistWithId;
  classId: string;
  isTeacher: boolean;
  progressHandlers?: PlaylistProgressHandlers;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}) {
  const { items, loading, addItem, removeItem } = usePlaylistItems(playlist.id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newRequirement, setNewRequirement] =
    useState<PlaylistItemRequirement>("recommended");
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await addItem({
        title: newTitle.trim(),
        author: newAuthor.trim() || undefined,
        link: newLink.trim() || undefined,
        requirement: newRequirement,
      });
      setNewTitle("");
      setNewAuthor("");
      setNewLink("");
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-gray-600 hover:text-gray-900"
      >
        ← Back
      </button>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        {playlist.name}
      </h3>
      {playlist.description && (
        <p className="mb-4 text-sm text-gray-600">{playlist.description}</p>
      )}
      {isTeacher && (
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="mb-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {showAddForm ? "Cancel" : "Add item"}
        </button>
      )}
      {showAddForm && isTeacher && (
        <form onSubmit={handleAdd} className="mb-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Star Wars (John Williams)"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Author / Creator
            </label>
            <input
              type="text"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Link (URL)
            </label>
            <input
              type="url"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Requirement
            </label>
            <select
              value={newRequirement}
              onChange={(e) =>
                setNewRequirement(e.target.value as PlaylistItemRequirement)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="recommended">Recommended</option>
              <option value="mandatory">Mandatory</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add item"}
          </button>
        </form>
      )}
      {loading && <p className="text-gray-500">Loading items…</p>}
      {!loading && items.length === 0 && (
        <p className="text-gray-600">No items in this playlist.</p>
      )}
      {!loading && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <PlaylistItemRow
              key={item.id}
              item={item}
              isTeacher={isTeacher}
              classId={classId}
              playlistId={playlist.id}
              progressHandlers={progressHandlers}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </ul>
      )}
      {isTeacher && (
        <button
          type="button"
          onClick={() => onDelete(playlist.id)}
          className="mt-6 text-sm text-red-600 hover:underline"
        >
          Delete playlist
        </button>
      )}
    </div>
  );
}

function PlaylistItemRow({
  item,
  isTeacher,
  classId,
  playlistId,
  progressHandlers,
  onRemove,
}: {
  item: PlaylistItemWithId;
  isTeacher: boolean;
  classId: string;
  playlistId: string;
  progressHandlers?: PlaylistProgressHandlers;
  onRemove: () => void;
}) {
  const progress = progressHandlers?.getStatus(playlistId, item.id);

  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
      <div>
        <p className="font-medium text-gray-900">{item.title}</p>
        {item.author && (
          <p className="text-sm text-gray-600">{item.author}</p>
        )}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-primary hover:underline"
          >
            Open link →
          </a>
        )}
        <span
          className={`ml-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
            item.requirement === "mandatory"
              ? "bg-amber-100 text-amber-800"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {item.requirement}
        </span>
      </div>
      {!isTeacher && progressHandlers && (
        <PlaylistItemStudentActions
          item={item}
          classId={classId}
          playlistId={playlistId}
          progress={progress}
          addToDoList={progressHandlers.addToDoList}
          setStatus={progressHandlers.setStatus}
          removeFromDoList={progressHandlers.removeFromDoList}
        />
      )}
      {isTeacher && (
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-red-600 hover:underline"
        >
          Remove
        </button>
      )}
    </li>
  );
}

function PlaylistItemStudentActions({
  item,
  classId,
  playlistId,
  progress,
  addToDoList,
  setStatus,
  removeFromDoList,
}: {
  item: PlaylistItemWithId;
  classId: string;
  playlistId: string;
  progress: PlaylistItemProgressDoc | undefined;
  addToDoList: (a: string, b: string, c: string) => Promise<void>;
  setStatus: (
    a: string,
    b: string,
    c: string,
    d: "todo" | "in_progress" | "done"
  ) => Promise<void>;
  removeFromDoList: (a: string, b: string) => Promise<void>;
}) {
  if (progress === undefined) {
    return (
      <button
        type="button"
        onClick={() => addToDoList(playlistId, item.id, classId)}
        className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
      >
        Add to do list
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <select
        value={progress.status}
        onChange={(e) =>
          setStatus(
            playlistId,
            item.id,
            classId,
            e.target.value as "todo" | "in_progress" | "done"
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
        onClick={() => removeFromDoList(playlistId, item.id)}
        className="text-sm text-gray-600 hover:underline"
      >
        Remove from list
      </button>
    </div>
  );
}
