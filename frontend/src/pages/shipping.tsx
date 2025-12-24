import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';

export default function Shipping() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            Home / <span className="text-gray-900 font-semibold">Shipping Policy</span>
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
