import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { functions, httpsCallable } from "../firebase";

export default function PurchaseClassPage() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const [className, setClassName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckout = httpsCallable<
    { classId: string },
    { url: string; className: string }
  >(functions, "createCheckoutSession");

  const handlePurchase = async () => {
    if (!classId || !user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createCheckout({ classId });
      const data = res.data;
      if (data?.url) {
        setClassName(data.className);
        window.location.href = data.url;
      } else {
        setError("Could not create checkout session");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-md">
        <Link
          to="/student"
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to courses
        </Link>
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Purchase class access
        </h2>
        <p className="mb-6 text-gray-600">
          Click below to purchase access to this class. You will be redirected to
          secure checkout.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handlePurchase}
          disabled={loading}
          className="rounded-xl bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Redirecting to checkout…" : "Proceed to checkout"}
        </button>
      </div>
    </ProtectedRoute>
  );
}
