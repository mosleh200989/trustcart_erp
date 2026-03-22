import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import { FaHome, FaArrowLeft } from 'react-icons/fa';

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-orange-500 mb-4">
          {statusCode || 'Error'}
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          {statusCode === 404
            ? 'Page not found'
            : statusCode === 500
            ? 'Internal server error'
            : 'An error occurred'}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaArrowLeft />
            Go Back
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <FaHome />
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
