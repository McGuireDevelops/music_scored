import { useState, useEffect } from "react";
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
];

export default function TeacherSettingsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings, features, loading, updateFeatures, refetch } = useTeacherSettings(user?.uid);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

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
          to="/teacher"
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
              Other settings
            </h3>
            <p className="text-sm text-gray-600">
              Additional preferences (coming soon).
            </p>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
