import { Link } from "react-router-dom";
import { SignInForm } from "../components/SignInForm";

export default function SignIn() {
  return (
    <>
      <p className="mb-6 text-gray-600">Sign in to access your classes and lessons.</p>
      <SignInForm embedded />
      <p className="mt-6 text-center">
        <Link to="/" className="text-sm text-gray-500 no-underline hover:text-gray-700">
          Back to home
        </Link>
      </p>
    </>
  );
}
