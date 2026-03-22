import Head from 'next/head';
import Link from 'next/link';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import { SITE_NAME, canonicalUrl } from '@/config/seo';

export default function Shipping() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Shipping Policy | {SITE_NAME}</title>
        <meta name="description" content={`Learn about ${SITE_NAME} shipping options, delivery areas, and estimated delivery times across Bangladesh.`} />
        <link rel="canonical" href={canonicalUrl('/shipping')} />
        <meta property="og:title" content={`Shipping Policy | ${SITE_NAME}`} />
        <meta property="og:url" content={canonicalUrl('/shipping')} />
        <meta property="og:site_name" content={SITE_NAME} />
      </Head>
      <ElectroNavbar />

      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            <Link href="/" className="hover:text-orange-500">Home</Link> / <span className="text-gray-900 font-semibold">Shipping Policy</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Shipping Policy</h1>
          <p className="text-gray-600 mb-4">
            We aim to deliver your orders as quickly and safely as possible. Below you can find key details
            about our shipping process.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Standard delivery time within Dhaka is 1-3 business days.</li>
            <li>Outside Dhaka, delivery may take 3-7 business days depending on location.</li>
            <li>Shipping charges may vary based on weight and delivery address.</li>
            <li>You will receive an SMS/Email once your order is shipped.</li>
          </ul>
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
