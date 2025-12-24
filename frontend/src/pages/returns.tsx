import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';

export default function Returns() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            Home / <span className="text-gray-900 font-semibold">Returns & Refunds</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Returns & Refunds</h1>
          <p className="text-gray-600 mb-4">
            We want you to be fully satisfied with your purchase. If there is any issue with your order,
            you can request a return or refund under the following conditions:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Products must be unused and in their original packaging.</li>
            <li>Return requests should be placed within 3 days of delivery.</li>
            <li>Refunds will be processed to your original payment method where possible.</li>
            <li>For any assistance, please contact our customer support.</li>
          </ul>
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
