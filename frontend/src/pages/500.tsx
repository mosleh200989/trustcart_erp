import Link from 'next/link';
import { FaHome, FaExclamationTriangle } from 'react-icons/fa';

export default function Custom500() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <FaExclamationTriangle className="text-9xl text-red-500 mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-gray-800 mb-4">500</h1>
        <p className="text-2xl text-gray-600 mb-2">Internal Server Error</p>
        <p className="text-gray-500 mb-8">
          Something went wrong on our end. Please try again later.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <FaHome />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
