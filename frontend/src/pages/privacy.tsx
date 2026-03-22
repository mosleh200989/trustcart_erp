import Head from 'next/head';
import Link from 'next/link';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import { SITE_NAME, canonicalUrl } from '@/config/seo';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Privacy Policy | {SITE_NAME}</title>
        <meta name="description" content={`Read the ${SITE_NAME} privacy policy. Learn how we collect, use, and protect your personal information.`} />
        <link rel="canonical" href={canonicalUrl('/privacy')} />
        <meta property="og:title" content={`Privacy Policy | ${SITE_NAME}`} />
        <meta property="og:url" content={canonicalUrl('/privacy')} />
        <meta property="og:site_name" content={SITE_NAME} />
      </Head>
      <ElectroNavbar />

      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            <Link href="/" className="hover:text-orange-500">Home</Link> / <span className="text-gray-900 font-semibold">Privacy Policy</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Privacy Policy</h1>
          <p className="text-gray-600 mb-4">
            We respect your privacy and are committed to protecting your personal information. This page
            explains how we collect, use, and safeguard your data when you use TrustCart.
          </p>
          <p className="text-gray-600 mb-2">
            We only collect information necessary to process your orders and improve our services. Your
            data will not be sold to any third party.
          </p>
          <p className="text-gray-600">
            For any questions about your privacy or data, please contact our support team.
          </p>
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
