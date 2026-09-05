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
          <p className="text-gray-600 mb-8">
            For any questions about your privacy or data, please contact our support team.
          </p>

          {/* Meta requires the Messenger data handling to be described before it
              will grant Advanced Access to pages_messaging. This section is a
              plain description of what the automation actually stores. */}
          <h2 className="text-xl font-bold text-gray-800 mb-3">Facebook Messenger</h2>
          <p className="text-gray-600 mb-2">
            If you message our Facebook Page, we receive and store that conversation so we can answer
            you. That includes the messages themselves, the name shown on your Facebook profile, and
            the page-scoped identifier Facebook gives us — an id that only works between you and our
            Page, and cannot be used to find your Facebook profile elsewhere.
          </p>
          <p className="text-gray-600 mb-2">
            Some replies on our Page are sent automatically. If you place an order through Messenger we
            also store the name, phone number and delivery address you give us, exactly as we would for
            an order placed on this website. We never ask for payment details in Messenger — orders
            taken there are cash on delivery.
          </p>
          <p className="text-gray-600 mb-2">
            Older conversations are removed automatically on a schedule. Where we keep past
            conversations to improve how we write our replies, every number and identifier in them —
            prices, phone numbers, order numbers — is stripped out before storage.
          </p>
          <p className="text-gray-600">
            You can ask us to delete your data at any time. See our{' '}
            <Link href="/data-deletion" className="text-orange-600 underline">
              data deletion instructions
            </Link>
            .
          </p>
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
