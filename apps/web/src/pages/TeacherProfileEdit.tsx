import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { getPermissionErrorMessage, isFirebasePermissionError } from "../utils/firebaseErrors";

export default function TeacherProfileEdit() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366F1");
  const [accentColor, setAccentColor] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    setError(null);
    getDoc(doc(db, "teacherProfiles", user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setDisplayName(d.displayName ?? "");
          setHeadline(d.headline ?? "");
          setBio(d.bio ?? "");
          setTenantName(d.tenantName ?? "");
          setLogoUrl(d.logoUrl ?? "");
          setPrimaryColor(d.primaryColor ?? "#6366F1");
          setAccentColor(d.accentColor ?? "");
        } else {
          setDisplayName(user.displayName ?? "");
        }
      })
      .catch((err) => {
        if (isFirebasePermissionError(err)) {
          setError(getPermissionErrorMessage(err, "Failed to load profile"));
        }
      })
      .finally(() => setLoading(false));
  }, [user?.uid, user?.displayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await setDoc(
        doc(db, "teacherProfiles", user.uid),
        {
          userId: user.uid,
          displayName: displayName.trim() || null,
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          tenantName: tenantName.trim() || null,
          logoUrl: logoUrl.trim() || null,
          primaryColor: primaryColor.trim() || null,
          accentColor: accentColor.trim() || null,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      setSaved(true);
    } catch (err) {
      if (isFirebasePermissionError(err)) {
        setError(getPermissionErrorMessage(err, "Failed to save profile"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const allowed = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
    if (!allowed.includes(ext)) {
      return;
    }
    setLogoUploading(true);
    setError(null);
    try {
      const path = `tenants/${user.uid}/logo.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setLogoUrl(url);
    } catch (err) {
      if (isFirebasePermissionError(err)) {
        setError(getPermissionErrorMessage(err, "Failed to upload logo"));
      }
    } finally {
      setLogoUploading(false);
    }
    e.target.value = "";
  };

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <Link
          to="/"
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
          <h3 className="mb-4 border-t border-gray-200 pt-6 text-lg font-medium text-gray-900">
            Branding
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Customize how your courses appear to students (logo, colors, name).
          </p>
          <div className="mb-4">
            <label
              htmlFor="tenantName"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Tenant / school name
            </label>
            <input
              id="tenantName"
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="e.g. Acme Music School"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              Shown in sidebar and header. Falls back to &quot;Learning Scores&quot; if empty.
            </p>
          </div>
          <div className="mb-4">
            <label
              htmlFor="logoUrl"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Logo
            </label>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-2">
                <input
                  id="logoFile"
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                  className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:hover:bg-primary-dark"
                />
                {logoUploading && (
                  <span className="text-sm text-gray-500">Uploading…</span>
                )}
              </div>
              <div className="flex-1 min-w-[200px]">
                <input
                  id="logoUrl"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Or paste logo URL"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            {logoUrl && (
              <div className="mt-2">
                <img src={logoUrl} alt="Logo preview" className="h-12 w-auto object-contain" />
              </div>
            )}
          </div>
          <div className="mb-4 flex flex-wrap gap-6">
            <div>
              <label
                htmlFor="primaryColor"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Primary color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#6366F1"
                  className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="accentColor"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Accent color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="accentColor"
                  type="color"
                  value={accentColor || "#818CF8"}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#818CF8 (optional)"
                  className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
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
