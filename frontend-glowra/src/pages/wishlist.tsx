import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import Link from 'next/link';
import Image from 'next/image';
import { FaShoppingCart, FaBolt } from 'react-icons/fa';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { useFlyToCart } from '@/hooks/useFlyToCart';
import { safeGetItem, safeSetItem } from '@/utils/safeStorage';

interface WishlistItem {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const { addItem } = useCart();
  const router = useRouter();
  const toast = useToast();
  const { fly } = useFlyToCart();

  useEffect(() => {
    const stored = JSON.parse(safeGetItem('wishlist') || '[]');
    setItems(stored);

    const handleUpdate = () => {
      const updated = JSON.parse(safeGetItem('wishlist') || '[]');
      setItems(updated);
    };

    window.addEventListener('wishlistUpdated', handleUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleUpdate);
  }, []);

  const handleRemove = (id: number) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    safeSetItem('wishlist', JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlistUpdated'));
  };

  const handleAddToCart = (item: WishlistItem, e: React.MouseEvent) => {
    // Fly-to-cart animation — starts from the button, grabs image from card
    const btn = e.currentTarget as HTMLElement;
    const card = btn.closest('.wishlist-product-card') as HTMLElement | null;
    fly(btn, card);

    addItem({
      id: item.id,
      name: item.name,
      name_en: item.name,
      price: item.price,
      quantity: 1,
      image: item.image,
    });
    
    toast.success("Added to cart successfully!");
  };

  const handleBuyNow = (item: WishlistItem) => {
    addItem({
      id: item.id,
      name: item.name,
      name_en: item.name,
      price: item.price,
      quantity: 1,
      image: item.image,
    });
    router.push('/checkout');
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
            {items.map((item) => {
              const hasDiscount = item.originalPrice && item.originalPrice > item.price;
              return (
                <div key={item.id} className="wishlist-product-card bg-white rounded-lg shadow border p-4 flex flex-col">
                  <Link href={`/products/${item.id}`} className="flex-1">
                    {/* 1:1 Aspect Ratio for Professional E-commerce Look */}
                    <div className="relative w-full pt-[100%] bg-gray-50 mb-3 overflow-hidden rounded-lg">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-4xl">📦</span>
                        </div>
                      )}
                    </div>
                    <h2 className="font-semibold text-gray-800 mb-1 line-clamp-2">{item.name}</h2>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-orange-500 font-bold">৳{item.price}</span>
                      {hasDiscount && (
                        <span className="text-gray-400 text-sm line-through">৳{item.originalPrice}</span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={(e) => handleAddToCart(item, e)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 text-white text-sm py-2 rounded-lg hover:bg-orange-600 transition-colors"
                      aria-label={`Add ${item.name} to cart`}
                    >
                      <FaShoppingCart size={14} />
                      Add to Cart
                    </button>
                    <button
                      onClick={() => handleBuyNow(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-sm py-2 rounded-lg hover:bg-green-700 transition-colors"
                      aria-label={`Buy ${item.name} now`}
                    >
                      <FaBolt size={14} />
                      Buy Now
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="mt-2 text-sm text-red-600 hover:underline self-start"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ElectroFooter />
    </div>
  );
}
