import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export default function TeacherProfileEdit() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "teacherProfiles", user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setDisplayName(d.displayName ?? "");
        setHeadline(d.headline ?? "");
        setBio(d.bio ?? "");
      } else {
        setDisplayName(user.displayName ?? "");
      }
      setLoading(false);
    });
  }, [user?.uid, user?.displayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(
        doc(db, "teacherProfiles", user.uid),
        {
          userId: user.uid,
          displayName: displayName.trim() || null,
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <Link
          to="/teacher"
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to dashboard
        </Link>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">
          Edit your profile
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Your public profile is visible at{" "}
          <Link
            to={`/profile/${user?.uid}`}
            className="font-medium text-primary hover:underline"
          >
            /profile/{user?.uid}
          </Link>
        </p>
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl rounded-card border border-gray-200 bg-white p-6 shadow-card"
        >
          <div className="mb-4">
            <label
              htmlFor="displayName"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="headline"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Headline
            </label>
            <input
              id="headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Film composer & educator"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="bio"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell students about yourself..."
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
            {saved && (
              <span className="text-sm text-green-600">Profile saved.</span>
            )}
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
