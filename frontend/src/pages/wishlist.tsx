import { useEffect, useState } from 'react';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import Link from 'next/link';

interface WishlistItem {
  id: number;
  name: string;
  price: number;
  image?: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
    setItems(stored);

    const handleUpdate = () => {
      const updated = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setItems(updated);
    };

    window.addEventListener('wishlistUpdated', handleUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleUpdate);
  }, []);

  const handleRemove = (id: number) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlistUpdated'));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">Your wishlist is empty.</p>
            <Link
              href="/products"
              className="inline-block bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-600"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow border p-4 flex flex-col">
                <Link href={`/products/${item.id}`} className="flex-1">
                  <div className="h-40 flex items-center justify-center bg-gray-50 mb-3 overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="object-contain max-h-full"
                      />
                    ) : (
                      <span className="text-4xl">📦</span>
                    )}
                  </div>
                  <h2 className="font-semibold text-gray-800 mb-1 line-clamp-2">{item.name}</h2>
                  <div className="text-orange-500 font-bold mb-2">৳{item.price}</div>
                </Link>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="mt-2 text-sm text-red-600 hover:underline self-start"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ElectroFooter />
    </div>
  );
}
