import Head from 'next/head';
import Link from 'next/link';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import { SITE_NAME, canonicalUrl } from '@/config/seo';

const SUPPORT_EMAIL = 'support@trustcart.com.bd';

/**
 * Data deletion instructions.
 *
 * Meta requires a public URL for this before it will grant Advanced Access to
 * `pages_messaging` — without it the App Review submission cannot be completed.
 *
 * The content is a plain description of what the Messenger automation actually
 * stores, taken from the schema rather than written aspirationally: conversation
 * rows keyed by a Facebook-scoped id, message text, and the name, phone and
 * address given while placing an order.
 */
export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Data Deletion Instructions | {SITE_NAME}</title>
        <meta
          name="description"
          content={`How to ask ${SITE_NAME} to delete the personal data we hold about you, including Facebook Messenger conversations.`}
        />
        <link rel="canonical" href={canonicalUrl('/data-deletion')} />
        <meta property="og:title" content={`Data Deletion Instructions | ${SITE_NAME}`} />
        <meta property="og:url" content={canonicalUrl('/data-deletion')} />
        <meta property="og:site_name" content={SITE_NAME} />
      </Head>
      <ElectroNavbar />

      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            <Link href="/" className="hover:text-orange-500">
              Home
            </Link>{' '}
            / <span className="text-gray-900 font-semibold">Data Deletion</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 space-y-6">
          <h1 className="text-3xl font-bold text-gray-800">Data Deletion Instructions</h1>

          <p className="text-gray-600">
            You can ask us to delete the personal information we hold about you at any time, including
            anything from a conversation with us on Facebook Messenger.
          </p>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">How to request deletion</h2>
            <p className="text-gray-600">Contact us in any of these ways and say you want your data deleted:</p>
            <ul className="list-disc space-y-1 pl-6 text-gray-600">
              <li>
                Email{' '}
                <a className="text-orange-600 underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>{' '}
                with the subject &ldquo;Data deletion request&rdquo;
              </li>
              <li>Send a message to our Facebook Page asking us to delete your data</li>
              <li>
                Use our{' '}
                <Link href="/contact" className="text-orange-600 underline">
                  contact page
                </Link>
              </li>
            </ul>
            <p className="text-gray-600">
              Tell us the mobile number or Facebook name you used, so we can find the right records.
              We complete deletion requests within 30 days and confirm when it is done.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">What we delete</h2>
            <ul className="list-disc space-y-1 pl-6 text-gray-600">
              <li>Your Messenger conversation with our Page, and the messages in it</li>
              <li>The Facebook-scoped identifier that links that conversation to you</li>
              <li>Your name, phone number and delivery address held in our customer records</li>
              <li>Any draft order that was never completed</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">What we may have to keep</h2>
            <p className="text-gray-600">
              Where you have placed an order, we keep the order record itself for as long as accounting
              and tax rules require. We remove your contact details from it where we are permitted to.
              We will tell you exactly what was kept and why.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">Removing our access on Facebook</h2>
            <p className="text-gray-600">
              You can also remove our app&rsquo;s access to your Facebook account directly: go to Facebook{' '}
              <span className="font-medium">Settings &amp; Privacy → Settings → Apps and Websites</span>,
              find our app, and remove it. That stops any further data reaching us, and you can still ask
              us to delete what we already hold using the steps above.
            </p>
          </section>

          <p className="text-sm text-gray-500">
            See also our{' '}
            <Link href="/privacy" className="text-orange-600 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
