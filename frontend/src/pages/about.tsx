import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />
      
      {/* Breadcrumb */}
      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            Home / <span className="text-gray-900 font-semibold">About</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">About TrustCart</h1>
          
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Our Mission</h3>
            <p className="text-gray-600 leading-relaxed">
              TrustCart is your trusted online marketplace for authentic and quality products. 
              We are committed to providing our customers with the best shopping experience through 
              our comprehensive ERP platform.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">What We Offer</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-orange-500">✓</span> Wide range of quality products
              </li>
              <li className="flex items-center gap-2">
                <span className="text-orange-500">✓</span> Competitive prices
              </li>
              <li className="flex items-center gap-2">
                <span className="text-orange-500">✓</span> Fast and reliable delivery
              </li>
              <li className="flex items-center gap-2">
                <span className="text-orange-500">✓</span> Secure payment options
              </li>
              <li className="flex items-center gap-2">
                <span className="text-orange-500">✓</span> Excellent customer support
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Contact Information</h3>
            <p className="text-gray-600 leading-relaxed">
                <strong>Office Hours:</strong> 8:00 AM to 12:00 AM<br />
                <strong>Hotline:</strong> 01707653536<br />
                <strong>Email:</strong> contact@trustcart.com.bd
              </p>
          </div>
        </div>
      </div>
      
      <ElectroFooter />
    </div>
  );
}
