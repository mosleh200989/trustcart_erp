import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';

export default function FAQ() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            Home / <span className="text-gray-900 font-semibold">FAQ</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h1>
          <div className="space-y-6 text-gray-600">
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">How can I track my order?</h3>
              <p>You can use the Track Order page from the footer and enter your order ID.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">What payment methods do you accept?</h3>
              <p>We accept major cards, mobile banking, and cash on delivery in selected areas.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Can I change my delivery address?</h3>
              <p>You can update your address before the order is shipped. Please contact support.</p>
            </div>
          </div>
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
