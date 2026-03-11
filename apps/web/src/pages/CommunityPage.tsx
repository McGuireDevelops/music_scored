import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import type { Thread, ThreadType } from "@learning-scores/shared";

export default function CommunityPage() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);
  const [threads, setThreads] = useState<(Thread & { id: string })[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<ThreadType>("discussion");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!classId) return;
    const q = query(
      collection(db, "communities"),
      where("classId", "==", classId)
    );
    getDocs(q).then((snap) => {
      setCommunities(
        snap.docs.map((d) => ({ id: d.id, name: d.data().name ?? "Community" }))
      );
      if (snap.docs.length > 0 && !selectedCommunity)
        setSelectedCommunity(snap.docs[0].id);
      setLoading(false);
    });
  }, [classId]);

  useEffect(() => {
    if (!selectedCommunity) return;
    getDocs(
      collection(db, "communities", selectedCommunity, "threads")
    ).then((snap) => {
      setThreads(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Thread & { id: string }))
      );
    });
  }, [selectedCommunity]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommunity || !user || !newTitle.trim()) return;
    const title = newTitle.trim();
    const content = newContent.trim();
    setPosting(true);
    try {
      const ref = await addDoc(
        collection(db, "communities", selectedCommunity, "threads"),
        {
          communityId: selectedCommunity,
          authorId: user.uid,
          type: newType,
          title,
          content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      );
      setNewTitle("");
      setNewContent("");
      setThreads((prev) => [
        ...prev,
        {
          id: ref.id,
          communityId: selectedCommunity,
          authorId: user.uid,
          type: newType,
          title,
          content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as Thread & { id: string },
      ]);
    } finally {
      setPosting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div>
        <Link
          to={`/student/class/${classId}`}
          style={{ color: "#666", marginBottom: "1rem", display: "inline-block" }}
        >
          ← Back to class
        </Link>
        <h2>Community</h2>
        {loading && <p>Loading…</p>}
        {!loading && communities.length === 0 && <p>No community for this class.</p>}
        {!loading && communities.length > 0 && (
          <>
            <div style={{ marginBottom: "1rem" }}>
              {communities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCommunity(c.id)}
                  style={{
                    marginRight: "0.5rem",
                    fontWeight: selectedCommunity === c.id ? 600 : 400,
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <form onSubmit={handlePost} style={{ marginBottom: "1.5rem" }}>
              <input
                placeholder="Thread title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ display: "block", marginBottom: "0.5rem", padding: "0.35rem" }}
              />
              <textarea
                placeholder="Content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                style={{ display: "block", marginBottom: "0.5rem", padding: "0.35rem", width: "100%", minHeight: 60 }}
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ThreadType)}
                style={{ marginRight: "0.5rem" }}
              >
                <option value="discussion">Discussion</option>
                <option value="critique">Critique</option>
                <option value="reference">Reference</option>
                <option value="announcement">Announcement</option>
              </select>
              <button type="submit" disabled={posting}>
                {posting ? "Posting…" : "Post"}
              </button>
            </form>
            <div>
              {threads.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: "1rem",
                    marginBottom: "0.5rem",
                    background: "#f5f5f5",
                    borderRadius: 8,
                  }}
                >
                  <strong>{t.title}</strong> [{t.type}]
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>{t.content}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
