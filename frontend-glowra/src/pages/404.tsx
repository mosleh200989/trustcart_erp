import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaHome, FaArrowLeft } from 'react-icons/fa';

export default function Custom404() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl sm:text-8xl md:text-9xl font-bold text-orange-500 mb-4">404</h1>
        <p className="text-xl sm:text-2xl text-gray-600 mb-2">Page Not Found</p>
        <p className="text-sm sm:text-base text-gray-500 mb-8">
          The page you are looking for doesn't exist or has been moved.
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
