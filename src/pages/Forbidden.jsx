import { Link } from "react-router-dom";

export default function Forbidden() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-6xl font-bold text-red-600">403</h1>
      <p className="mt-4 text-gray-700 text-lg">
        You don't have permission to access this page.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
      >
        Go back
      </Link>
    </div>
  );
}
