import { Link } from "react-router-dom";

export default function HelpPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
        Help
      </h1>
      <p className="mb-8 text-gray-600">
        Get started and find answers to common questions.
      </p>

      <div className="max-w-2xl space-y-8">
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Getting started</h2>
          <ul className="list-inside list-disc space-y-2 text-gray-600">
            <li>
              <strong>Teachers:</strong> Use the Dashboard to manage courses, students, and assignments.
              Create a class from the Dashboard, then add curriculum, modules, lessons, and assignments.
            </li>
            <li>
              <strong>Students:</strong> Go to Courses to see your enrolled classes. Open a class to
              view lessons, assignments, quizzes, and your portfolio.
            </li>
          </ul>
        </section>

        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Navigation</h2>
          <ul className="list-inside list-disc space-y-2 text-gray-600">
            <li><strong>Dashboard</strong> — Overview and quick links</li>
            <li><strong>Curriculum</strong> — Courses, modules, lessons, assignments, roster</li>
            <li><strong>Documents</strong> — Quizzes, playlists, library, live sessions, certifications</li>
            <li><strong>Calendar</strong> — Upcoming live lessons and events</li>
            <li><strong>Settings</strong> — Feature toggles and account (teachers)</li>
          </ul>
        </section>

        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Need more help?</h2>
          <p className="mb-4 text-gray-600">
            Contact your teacher or administrator for course-specific questions.
            For platform support, use the contact details provided by your institution.
          </p>
          <Link
            to="/"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            Back to Dashboard
          </Link>
        </section>
      </div>
    </div>
  );
}
