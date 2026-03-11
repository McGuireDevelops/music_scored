import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useTeacherSettings } from "../hooks/useTeacherSettings";
import { functions, httpsCallable } from "../firebase";
import type { TeacherFeatureFlags } from "@learning-scores/shared";

const FEATURE_LABELS: { key: keyof TeacherFeatureFlags; label: string }[] = [
  { key: "quizzes", label: "Quizzes" },
  { key: "community", label: "Community" },
  { key: "liveLessons", label: "Live lessons" },
  { key: "assignments", label: "Assignments" },
  { key: "certificates", label: "Certificates" },
  { key: "playlists", label: "Playlists" },
  { key: "paidClasses", label: "Paid classes" },
  { key: "officeHours", label: "Office hours (1-on-1 bookings)" },
];

export default function TeacherSettingsPage() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // Only fetch teacherSettings when user has teacher/admin role (Firestore rules require this)
  const canAccessSettings = profile?.role === "teacher" || profile?.role === "admin";
  const { settings, features, loading, updateFeatures, updateSettings, refetch } = useTeacherSettings(canAccessSettings ? user?.uid : undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const [zoomAccountId, setZoomAccountId] = useState("");
  const [zoomClientId, setZoomClientId] = useState("");
  const [zoomClientSecret, setZoomClientSecret] = useState("");
  const [zoomSaving, setZoomSaving] = useState(false);
  const [zoomSaved, setZoomSaved] = useState(false);
  const [zoomError, setZoomError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setZoomAccountId(settings.zoomAccountId ?? "");
      setZoomClientId(settings.zoomClientId ?? "");
      setZoomClientSecret("");
    }
  }, [settings]);

  const handleSaveZoom = useCallback(async () => {
    setZoomSaving(true);
    setZoomSaved(false);
    setZoomError(null);
    try {
      const updates: Record<string, unknown> = {
        zoomAccountId: zoomAccountId.trim() || undefined,
        zoomClientId: zoomClientId.trim() || undefined,
      };
      if (zoomClientSecret.trim()) {
        updates.zoomClientSecret = zoomClientSecret.trim();
      }
      await updateSettings(updates);
      setZoomSaved(true);
      setZoomClientSecret("");
    } catch (err) {
      setZoomError(err instanceof Error ? err.message : "Failed to save Zoom settings");
    } finally {
      setZoomSaving(false);
    }
  }, [zoomAccountId, zoomClientId, zoomClientSecret, updateSettings]);

  useEffect(() => {
    const stripe = searchParams.get("stripe");
    if (stripe) {
      refetch();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refetch]);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const getLink = httpsCallable<
        Record<string, never>,
        { url: string | null; alreadyConnected: boolean }
      >(functions, "getStripeConnectOnboardingLink");
      const res = await getLink({});
      const data = res.data;
      if (data.alreadyConnected) {
        setStripeError(null);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStripeError("Could not get Stripe onboarding link");
      }
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : "Failed to connect Stripe");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleToggle = async (key: keyof TeacherFeatureFlags, value: boolean) => {
    setSaving(true);
    setSaved(false);
    try {
      await updateFeatures({ [key]: value });
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
          to="/"
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to dashboard
        </Link>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">
          Settings
        </h2>
        <div className="space-y-6">
          <section className="max-w-2xl rounded-card border border-gray-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Features</h3>
            <p className="mb-4 text-sm text-gray-600">
              Enable or disable features for your teaching workflow.
            </p>
            <div className="space-y-3">
              {FEATURE_LABELS.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3"
                >
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={features[key] ?? true}
                    onChange={(e) => handleToggle(key, e.target.checked)}
                    disabled={saving}
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
              ))}
            </div>
            {saved && (
              <p className="mt-4 text-sm text-green-600">Settings saved.</p>
            )}
          </section>
          <section className="max-w-2xl rounded-card border border-gray-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Stripe Connect
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Connect your Stripe account to receive payments for paid classes.
              Create products and prices in your Stripe Dashboard, then add the
              Price ID to each paid class.
            </p>
            {settings?.stripeOnboardingComplete ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                <span>Stripe connected</span>
              </div>
            ) : settings?.stripeConnectAccountId ? (
              <div className="space-y-2">
                <p className="text-sm text-amber-700">
                  Complete your Stripe account setup to accept payments.
                </p>
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={stripeLoading}
                  className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {stripeLoading ? "Loading…" : "Complete setup"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectStripe}
                disabled={stripeLoading}
                className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {stripeLoading ? "Loading…" : "Connect Stripe"}
              </button>
            )}
            {stripeError && (
              <p className="mt-2 text-sm text-red-600">{stripeError}</p>
            )}
          </section>
          <section className="max-w-2xl rounded-card border border-gray-200 bg-white p-6 shadow-card">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Zoom Integration
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Connect your Zoom account to automatically create meetings for
              live classes. Create a{" "}
              <a
                href="https://marketplace.zoom.us/docs/guides/build/server-to-server-oauth-app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Server-to-Server OAuth app
              </a>{" "}
              in the Zoom Marketplace and enter the credentials below.
            </p>
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-medium">Automatic recording &amp; transcription</p>
              <p className="mt-1">
                All Zoom meetings are automatically recorded to the cloud. To enable
                automatic transcription, ensure{" "}
                <strong>Audio transcript</strong> is turned on in your Zoom account
                settings (Settings &rarr; Recording &rarr; Cloud recording &rarr;
                Audio transcript). Cloud recording requires a Zoom Pro plan or higher.
              </p>
            </div>
            {settings?.zoomAccountId && settings?.zoomClientId && settings?.zoomClientSecret && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                <span>Zoom connected</span>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label htmlFor="zoom-account-id" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Account ID
                </label>
                <input
                  id="zoom-account-id"
                  type="text"
                  value={zoomAccountId}
                  onChange={(e) => setZoomAccountId(e.target.value)}
                  placeholder="Your Zoom Account ID"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="zoom-client-id" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Client ID
                </label>
                <input
                  id="zoom-client-id"
                  type="text"
                  value={zoomClientId}
                  onChange={(e) => setZoomClientId(e.target.value)}
                  placeholder="Your Zoom Client ID"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="zoom-client-secret" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Client Secret
                </label>
                <input
                  id="zoom-client-secret"
                  type="password"
                  value={zoomClientSecret}
                  onChange={(e) => setZoomClientSecret(e.target.value)}
                  placeholder={settings?.zoomClientSecret ? "••••••••  (leave blank to keep current)" : "Your Zoom Client Secret"}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveZoom}
                disabled={zoomSaving}
                className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {zoomSaving ? "Saving\u2026" : "Save Zoom Settings"}
              </button>
              {zoomSaved && (
                <p className="text-sm text-green-600">Zoom settings saved.</p>
              )}
              {zoomError && (
                <p className="text-sm text-red-600">{zoomError}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
