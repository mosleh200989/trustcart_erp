import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaHome, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';

export default function Custom500() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <FaExclamationTriangle className="text-6xl sm:text-8xl md:text-9xl text-red-500 mx-auto mb-4" />
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800 mb-4">500</h1>
        <p className="text-xl sm:text-2xl text-gray-600 mb-2">Internal Server Error</p>
        <p className="text-sm sm:text-base text-gray-500 mb-8">
          Something went wrong on our end. Please try again later.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaArrowLeft />
            Go Back
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <FaHome />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
