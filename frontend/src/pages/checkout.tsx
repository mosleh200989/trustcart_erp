import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import { FaCreditCard, FaShoppingBag } from 'react-icons/fa';
import apiClient, { auth, customers } from '@/services/api';
import { TrackingService } from '@/utils/tracking';

export default function Checkout() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(false);
   const [currentUser, setCurrentUser] = useState<any | null>(null);
   const [customerProfile, setCustomerProfile] = useState<any | null>(null);
   const [defaultAddress, setDefaultAddress] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    district: '',
    city: '',
    notes: '',
    paymentMethod: 'cash'
  });

  useEffect(() => {
    const stored = localStorage.getItem('cart');
    const cartData = stored ? JSON.parse(stored) : [];
    setCart(cartData);
    
    const total = cartData.reduce((sum: number, item: any) => 
      sum + (item.price * (item.quantity || 1)), 0
    );
    setSubtotal(total);

    const initCustomer = async () => {
      try {
        const user = await auth.getCurrentUser();
        if (user && (user as any).email) {
          setCurrentUser(user);
          const list = await customers.list();
          const match = (list as any[]).find((c) => c.email === (user as any).email);
          if (match) {
            setCustomerProfile(match);
            
            // Load customer addresses to get default address details
            try {
              const token = localStorage.getItem('authToken');
              const addressResponse = await apiClient.get('/customer-addresses', {
                headers: { Authorization: `Bearer ${token}` }
              });
              const addresses = addressResponse.data;
              const primaryAddress = addresses.find((addr: any) => addr.isPrimary) || addresses[0];
              
              if (primaryAddress) {
                setDefaultAddress(primaryAddress);
              }
              
              setFormData((prev) => ({
                ...prev,
                fullName: match.name || match.firstName + ' ' + (match.lastName || '') || prev.fullName,
                email: match.email || prev.email,
                phone: primaryAddress?.phone || match.phone || prev.phone,
                address: primaryAddress?.streetAddress || match.address || prev.address,
                district: primaryAddress?.district || prev.district,
                city: primaryAddress?.city || prev.city,
              }));
            } catch (addrError) {
              console.error('Error loading addresses:', addrError);
              // Fallback to basic customer data
              setFormData((prev) => ({
                ...prev,
                fullName: match.name || match.firstName + ' ' + (match.lastName || '') || prev.fullName,
                email: match.email || prev.email,
                phone: match.phone || prev.phone,
                address: match.address || prev.address,
              }));
            }
          }
        }
      } catch (e) {
        console.error('Error loading customer for checkout:', e);
      }
    };

    initCustomer();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.phone || !formData.address) {
      alert('Please fill in all required fields');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setLoading(true);
    
    try {
      // Collect tracking information
      const trackingInfo = await TrackingService.collectTrackingInfo();
      
      // If not logged in, check if customer exists by phone or email
      let customerId = customerProfile?.id ?? null;
      
      if (!customerId) {
        try {
          const allCustomers = await apiClient.get('/customers');
          const customers = allCustomers.data;
          
          // First check by phone
          let existingCustomer = customers.find((c: any) => c.phone === formData.phone);
          
          // If email provided and not found by phone, check by email
          if (!existingCustomer && formData.email) {
            existingCustomer = customers.find((c: any) => c.email === formData.email);
          }
          
          if (existingCustomer) {
            // Customer found, use existing ID
            customerId = existingCustomer.id;
          } else {
            // Customer not found, create new one
            const newCustomer = await apiClient.post('/customers', {
              name: formData.fullName,
              email: formData.email || null,
              phone: formData.phone,
              address: formData.address,
              city: formData.city,
              district: formData.district
            });
            customerId = newCustomer.data.id;
          }
        } catch (error) {
          console.error('Error checking/creating customer:', error);
          // Continue with order submission even if customer lookup fails
        }
      }
      
      const deliveryCharge = subtotal >= 500 ? 0 : 60;
      const total = subtotal + deliveryCharge;
      
      const orderData = {
        // Link to CRM/CDM customer if logged in or found/created
        customer_id: customerId,
        customer_name: formData.fullName,
        customer_email: formData.email || null,
        customer_phone: formData.phone,
        shipping_address: `${formData.address}, ${formData.district}, ${formData.city}`,
        notes: formData.notes,
        payment_method: formData.paymentMethod,
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name || item.name_en,
          quantity: item.quantity || 1,
          unit_price: item.price,
          total_price: item.price * (item.quantity || 1)
        })),
        subtotal: subtotal,
        delivery_charge: deliveryCharge,
        total_amount: total,
        status: 'pending',
        payment_status: formData.paymentMethod === 'cash' ? 'pending' : 'pending',
        // User tracking info
        user_ip: trackingInfo.userIp,
        geo_location: trackingInfo.geoLocation,
        browser_info: trackingInfo.browserInfo,
        device_type: trackingInfo.deviceType,
        operating_system: trackingInfo.operatingSystem,
        traffic_source: trackingInfo.trafficSource,
        referrer_url: trackingInfo.referrerUrl,
        utm_source: trackingInfo.utmSource,
        utm_medium: trackingInfo.utmMedium,
        utm_campaign: trackingInfo.utmCampaign,
      };

      const response = await apiClient.post('/sales', orderData);
      
      if (response.data) {
        alert('Order placed successfully! Order ID: #' + response.data.id);
        localStorage.removeItem('cart');
        router.push('/');
      }
    } catch (error: any) {
      console.error('Order submission error:', error);
      alert('Failed to place order: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const deliveryCharge = subtotal >= 500 ? 0 : 60;
  const total = subtotal + deliveryCharge;

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />
      
      {/* Breadcrumb */}
      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            Home / Cart / <span className="text-gray-900 font-semibold">Checkout</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
          <FaCreditCard className="text-orange-500" />
          Checkout
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Billing Details */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Billing Details</h3>

                {customerProfile && (
                  <div className="mb-5 p-4 border border-green-200 bg-green-50 rounded-lg text-sm text-gray-800">
                    <div className="font-semibold mb-1">Default Address (from your profile)</div>
                    {defaultAddress ? (
                      <>
                        <div className="font-medium">{customerProfile.name || formData.fullName}</div>
                        <div>{defaultAddress.phone || customerProfile.phone}</div>
                        <div>{defaultAddress.streetAddress}</div>
                        {defaultAddress.district && <div>District: {defaultAddress.district}</div>}
                        {defaultAddress.city && <div>City: {defaultAddress.city}</div>}
                        {defaultAddress.postalCode && <div>Postal Code: {defaultAddress.postalCode}</div>}
                      </>
                    ) : (
                      <>
                        <div>{customerProfile.name}</div>
                        <div>{customerProfile.phone}</div>
                        <div>{customerProfile.address || 'Not set'}</div>
                      </>
                    )}
                    <div className="text-xs text-gray-600 mt-1">
                      You can place the order to this address or update the fields below to deliver to a different location.
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-2">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-2">District *</label>
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2">Address *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-2">Order Notes (Optional)</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Add any special instructions for your order..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Payment Method</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-orange-500">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={handleChange}
                      className="text-orange-500"
                    />
                    <span className="font-semibold">Cash on Delivery</span>
                  </label>
                  
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-orange-500">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bkash"
                      checked={formData.paymentMethod === 'bkash'}
                      onChange={handleChange}
                      className="text-orange-500"
                    />
                    <span className="font-semibold">bKash</span>
                  </label>
                  
                  <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-orange-500">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={formData.paymentMethod === 'card'}
                      onChange={handleChange}
                      className="text-orange-500"
                    />
                    <span className="font-semibold">Credit/Debit Card</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <FaShoppingBag className="text-orange-500" />
                  Order Summary
                </h3>
                
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name || item.nameEn} × {item.quantity || 1}</span>
                      <span className="font-semibold">৳{(item.price * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4 space-y-2 mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">৳{subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className={`font-semibold ${deliveryCharge === 0 ? 'text-green-500' : ''}`}>
                      {deliveryCharge === 0 ? 'FREE' : `৳${deliveryCharge}`}
                    </span>
                  </div>
                </div>
                
                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between text-lg">
                    <strong>Total</strong>
                    <strong className="text-orange-500">৳{total.toFixed(2)}</strong>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || cart.length === 0}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <ElectroFooter />
    </div>
  );
}
