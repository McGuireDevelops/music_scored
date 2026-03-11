import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useTenant } from "../contexts/TenantContext";

export default function TeacherProfilePage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { branding } = useTenant();
  const [profile, setProfile] = useState<{
    displayName?: string;
    bio?: string;
    headline?: string;
    logoUrl?: string;
    tenantName?: string;
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
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        {(profile.logoUrl ?? branding.logoUrl) && (
          <img
            src={profile.logoUrl ?? branding.logoUrl}
            alt=""
            className="h-16 w-auto object-contain"
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {profile.displayName ?? "Teacher"}
          </h1>
          {(profile.tenantName ?? branding.tenantName) && (
            <p className="text-sm text-gray-500">
              {profile.tenantName ?? branding.tenantName}
            </p>
          )}
        </div>
      </div>
      {profile.headline && (
        <p className="mb-4 text-lg text-gray-600">{profile.headline}</p>
      )}
      {profile.bio && <p className="whitespace-pre-wrap text-gray-700">{profile.bio}</p>}
    </div>
  );
}
