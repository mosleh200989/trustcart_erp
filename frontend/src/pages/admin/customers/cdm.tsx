import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';

interface Customer360 {
  customer_id: number;
  name: string;
  last_name: string;
  email: string;
  phone: string;
  customer_type: 'new' | 'repeat' | 'vip' | 'inactive';
  lifecycle_stage: string;
  customer_temperature: 'hot' | 'warm' | 'cold';
  lifetime_value: number;
  total_orders: number;
  days_since_last_order: number;
}

export default function CustomersList360() {
  const [customers, setCustomers] = useState<Customer360[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterTemperature, setFilterTemperature] = useState('all');

  useEffect(() => {
    loadCustomers();
  }, [filterType, filterTemperature]);

  const loadCustomers = async () => {
    try {
      let url = 'http://localhost:3001/cdm/customer360?limit=100';
      if (filterType !== 'all') url += `&customerType=${filterType}`;
      if (filterTemperature !== 'all') url += `&temperature=${filterTemperature}`;

      const res = await fetch(url);
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Customer 360° View</h1>

        {/* Filters */}
        <div className="flex gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Types</option>
            <option value="vip">VIP</option>
            <option value="repeat">Repeat</option>
            <option value="new">New</option>
          </select>

          <select
            value={filterTemperature}
            onChange={(e) => setFilterTemperature(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Temps</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded shadow">
          {loading ? (
            <div className="p-12 text-center">Loading...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Temp</th>
                  <th className="px-4 py-3 text-right">LTV</th>
                  <th className="px-4 py-3 text-center">Orders</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.customer_id}>
                    <td className="px-4 py-3">
                      {c.name} {c.last_name}
                    </td>
                    <td className="px-4 py-3">{c.customer_type}</td>
                    <td className="px-4 py-3">{c.customer_temperature}</td>
                    <td className="px-4 py-3 text-right">৳{c.lifetime_value?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">{c.total_orders}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/admin/customers/${c.customer_id}`}
                        className="text-purple-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
