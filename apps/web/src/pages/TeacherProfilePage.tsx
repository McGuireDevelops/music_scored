import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function TeacherProfilePage() {
  const { profileId } = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<{
    displayName?: string;
    bio?: string;
    headline?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    getDoc(doc(db, "teacherProfiles", profileId))
      .then((snap) => {
        if (snap.exists()) setProfile(snap.data());
        else setProfile(null);
      })
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) return <p>Loading…</p>;
  if (!profile) return <p>Profile not found.</p>;

  return (
    <div>
      <h1>{profile.displayName ?? "Teacher"}</h1>
      {profile.headline && <p style={{ fontSize: "1.2rem", color: "#666" }}>{profile.headline}</p>}
      {profile.bio && <p style={{ whiteSpace: "pre-wrap" }}>{profile.bio}</p>}
    </div>
  );
}
