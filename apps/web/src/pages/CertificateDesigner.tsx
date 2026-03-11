import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";
import { useCertificateTemplate } from "../hooks/useCertificateTemplate";
export default function CertificateDesigner() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const { template, loading, createOrUpdateTemplate, linkToClass } =
    useCertificateTemplate(classId);
  const [className, setClassName] = useState<string>("");
  const [name, setName] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [bodyText, setBodyText] = useState("Certificate of Completion");
  const [footerText, setFooterText] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1D0D37");
  const [accentColor, setAccentColor] = useState("#6366F1");
  const [saving, setSaving] = useState(false);
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    if (classId)
      getDoc(doc(db, "classes", classId)).then((s) =>
        setClassName(s.exists() ? s.data()?.name ?? "Class" : "Class")
      );
  }, [classId]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setHeaderText(template.layout.headerText ?? "");
      setBodyText(template.layout.bodyText ?? "Certificate of Completion");
      setFooterText(template.layout.footerText ?? "");
      setPrimaryColor(template.layout.primaryColor ?? "#1D0D37");
      setAccentColor(template.layout.accentColor ?? "#6366F1");
    }
  }, [template]);

  useEffect(() => {
    if (!classId) return;
    getDoc(doc(db, "classes", classId)).then((s) => {
      if (s.exists()) setLinked(!!s.data()?.certificateTemplateId);
    });
  }, [classId, template]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !classId || !name.trim()) return;
    setSaving(true);
    try {
      const templateId = await createOrUpdateTemplate({
        ownerId: user.uid,
        name: name.trim(),
        layout: {
          headerText: headerText.trim() || null,
          bodyText: bodyText.trim() || "Certificate of Completion",
          footerText: footerText.trim() || null,
          primaryColor: primaryColor || null,
          accentColor: accentColor || null,
        },
      });
      if (!linked) {
        await linkToClass(templateId);
        setLinked(true);
      }
    } finally {
      setSaving(false);
    }
  };

  // Replace placeholders with sample values for live preview
  const previewBodyText = (bodyText || "Certificate of Completion")
    .replace(/\{\{studentName\}\}/g, "Jane Smith")
    .replace(/\{\{className\}\}/g, className || "Film Scoring 101")
    .replace(/\{\{issuedAt\}\}/g, new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  const handleAssignToCompletion = async () => {
    if (!classId || !template) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "classes", classId), {
        certificateTemplateId: template.id,
        completionCriteria: {
          type: "manual",
          config: { manualApprovalRequired: true },
        },
      });
      setLinked(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="teacher">
      <div>
        <Link
          to={`/teacher/class/${classId}`}
          className="mb-4 inline-block text-sm text-gray-600 no-underline transition-colors hover:text-gray-900"
        >
          ← Back to {className || "class"}
        </Link>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
          Certificate Designer
        </h1>
        <p className="mb-6 text-gray-600">
          Design a certificate and assign it to course completion for{" "}
          {className}.
        </p>

        {loading && <p className="text-gray-500">Loading…</p>}
        {!loading && (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <form
            onSubmit={handleSave}
            className="flex-1 space-y-6 rounded-card border border-gray-200 bg-white p-6 shadow-card lg:max-w-md"
          >
            <div>
              <label
                htmlFor="cert-name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Certificate name
              </label>
              <input
                id="cert-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Film Scoring 101 Completion"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="header-text"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Header text
              </label>
              <input
                id="header-text"
                type="text"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder="e.g. This is to certify that"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="body-text"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Body text
              </label>
              <input
                id="body-text"
                type="text"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Certificate of Completion"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-gray-500">
                Placeholders: {"{{studentName}}"}, {"{{className}}"},{" "}
                {"{{issuedAt}}"}
              </p>
            </div>
            <div>
              <label
                htmlFor="footer-text"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Footer text
              </label>
              <input
                id="footer-text"
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="e.g. Issued on [date]"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-6">
              <div>
                <label
                  htmlFor="primary-color"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Primary color
                </label>
                <input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded border border-gray-300"
                />
              </div>
              <div>
                <label
                  htmlFor="accent-color"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Accent color
                </label>
                <input
                  id="accent-color"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded border border-gray-300"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save template"}
              </button>
              {template && !linked && (
                <button
                  type="button"
                  onClick={handleAssignToCompletion}
                  disabled={saving}
                  className="rounded-xl border border-primary bg-white px-5 py-2.5 font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Assign to course completion
                </button>
              )}
              {linked && (
                <span className="flex items-center text-sm text-green-600">
                  ✓ Assigned to course completion
                </span>
              )}
            </div>
          </form>

          <div className="flex-1 lg:min-w-0">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Preview</h3>
            <div
              className="rounded-xl border-2 bg-white p-8 shadow-lg transition-colors"
              style={{
                borderColor: primaryColor,
                color: primaryColor,
                aspectRatio: "4/3",
              }}
            >
              <p className="mb-2 text-sm">{headerText || "This is to certify that"}</p>
              <p className="mb-4 text-2xl font-bold" style={{ color: accentColor }}>
                {previewBodyText}
              </p>
              {footerText && (
                <p className="mt-4 text-xs">{footerText}</p>
              )}
            </div>
          </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
