import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import TeacherDashboard from "./TeacherDashboard";

export default function Home() {
  const { user, profile } = useAuth();

  if (user && (profile?.role === "teacher" || profile?.role === "admin")) {
    return <TeacherDashboard />;
  }

  if (user) {
    return (
      <div className="max-w-2xl">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-gray-900">
          Learning Scores
        </h1>
        <p className="mb-8 text-gray-600">
          Professional Film Music Learning Platform by McGuireDevelops
        </p>
        <p className="mb-1 text-gray-700">
          Welcome, {profile?.displayName || profile?.email}.
        </p>
        <p className="mb-6 text-gray-600">
          You are signed in as <strong className="text-gray-900">{profile?.role}</strong>.
        </p>
        <Link
          to="/student"
          className="rounded-xl inline-flex items-center gap-2 bg-primary px-5 py-2.5 font-medium text-white no-underline transition-colors hover:bg-primary-dark"
        >
          Go to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-gray-900">
        Learning Scores
      </h1>
      <p className="mb-8 text-gray-600">
        Professional Film Music Learning Platform by McGuireDevelops
      </p>
      <div>
        <p className="text-gray-600">Sign in to access your classes and lessons.</p>
        <Link
          to="/signin"
          className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 font-medium text-white no-underline transition-colors hover:bg-primary-dark"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
