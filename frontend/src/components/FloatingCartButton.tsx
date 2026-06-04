import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaArrowLeft, FaArrowRight, FaMinus, FaPlus, FaShoppingBag, FaTimes } from 'react-icons/fa';
import { useCart } from '@/contexts/CartContext';
import apiClient from '@/services/api';

const hiddenPathPrefixes = [
  '/admin',
  '/cart',
  '/checkout',
  '/thank-you',
  '/lp',
  '/customer',
  '/supplier',
  '/payment',
];

function shouldHideFloatingCart(pathname: string, asPath: string) {
  if (hiddenPathPrefixes.some((prefix) => pathname.startsWith(prefix))) return true;
  return asPath.includes('landing_page=') || asPath.includes('landing_page_intl=') || asPath.includes('cartflows_step=');
}

export default function FloatingCartButton() {
  const router = useRouter();
  const { items, subtotal, addItem, removeItem, updateQuantity } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || suggestedProducts.length > 0) return;

    apiClient
      .get('/products/featured/suggested?limit=8')
      .then((response) => setSuggestedProducts(Array.isArray(response.data) ? response.data : []))
      .catch(() => {
        apiClient
          .get('/products')
          .then((response) => setSuggestedProducts((Array.isArray(response.data) ? response.data : []).slice(0, 8)))
          .catch(() => setSuggestedProducts([]));
      });
  }, [isOpen, suggestedProducts.length]);

  if (shouldHideFloatingCart(router.pathname, router.asPath)) {
    return null;
  }

  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const formatMoney = (amount: number) => `৳${amount.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
  const normalizeProduct = (product: any) => ({
    id: Number(product.id),
    name: product.name_en || product.nameEn || product.name || product.name_bn || 'Product',
    price: Number(product.price || product.sale_price || 0),
    image: product.image_url || product.image || product.thumbnail || '/default-product.png',
    url: `/products/${product.slug || product.id}`,
  });
  const scrollSuggestions = (direction: 'left' | 'right') => {
    suggestionsRef.current?.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth',
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Open cart with ${itemCount} item${itemCount === 1 ? '' : 's'}`}
        className="fixed right-0 top-1/2 z-50 flex -translate-y-1/2 flex-col overflow-hidden rounded-l-lg shadow-2xl transition-transform duration-200 hover:-translate-x-1 focus:outline-none focus:ring-4 focus:ring-orange-200"
      >
        <span className="flex min-w-[74px] flex-col items-center justify-center gap-1 bg-orange-500 px-3 py-3 text-white">
          <FaShoppingBag className="text-2xl" />
          <span className="text-xs font-bold leading-tight">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
        </span>
        <span className="min-w-[74px] bg-white px-3 py-2 text-center text-sm font-extrabold text-orange-500">
          {formatMoney(subtotal)}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Close cart drawer"
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[min(100vw,395px)] flex-col bg-white shadow-2xl">
            <header className="flex h-10 items-center justify-between border-b border-gray-200 px-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Shopping Cart</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-orange-500"
              >
                Close <FaArrowRight />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                  <FaShoppingBag className="mb-3 text-5xl text-orange-200" />
                  <p className="font-semibold text-gray-700">No items in your cart.</p>
                  <Link href="/products" onClick={() => setIsOpen(false)} className="mt-4 rounded-md bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const quantity = item.quantity || 1;
                    return (
                      <div key={item.cartItemId || `${item.id}-${index}`} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-gray-200">
                          <Image src={item.image || '/default-product.png'} alt={item.name || 'Product'} fill sizes="56px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">{item.name || item.nameEn || item.name_en || 'Product'}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-800">
                            <div className="inline-flex items-center overflow-hidden rounded-full border border-gray-200">
                              <button type="button" className="px-2 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-40" disabled={quantity <= 1} onClick={() => updateQuantity(index, quantity - 1)}>
                                <FaMinus size={10} />
                              </button>
                              <span className="min-w-6 text-center text-xs">{quantity}</span>
                              <button type="button" className="px-2 py-1 text-gray-500 hover:bg-gray-50" onClick={() => updateQuantity(index, quantity + 1)}>
                                <FaPlus size={10} />
                              </button>
                            </div>
                            <span className="text-xs">×</span>
                            <span>{formatMoney(item.price)} = {formatMoney(item.price * quantity)}</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeItem(index)} className="p-2 text-gray-500 hover:text-red-500" aria-label="Remove item">
                          <FaTimes />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="border-t border-gray-200 bg-white p-6">
              {suggestedProducts.length > 0 && (
                <div className="mb-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">You May Also Like</h3>
                      <div className="mt-1 h-0.5 w-10 bg-orange-500" />
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <button
                        type="button"
                        onClick={() => scrollSuggestions('left')}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600"
                        aria-label="Previous suggested products"
                      >
                        <FaArrowLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollSuggestions('right')}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600"
                        aria-label="Next suggested products"
                      >
                        <FaArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                  <div ref={suggestionsRef} className="flex gap-3 overflow-x-auto scroll-smooth pb-1">
                    {suggestedProducts.map((product) => {
                      const normalized = normalizeProduct(product);
                      return (
                        <Link
                          key={normalized.id}
                          href={normalized.url}
                          onClick={() => setIsOpen(false)}
                          className="flex min-w-[280px] items-center gap-3 rounded-lg border border-gray-200 p-3 transition hover:border-orange-300 hover:shadow-sm"
                        >
                          <div className="relative h-14 w-16 shrink-0">
                            <Image src={normalized.image} alt={normalized.name} fill sizes="64px" className="object-contain" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs font-medium text-gray-800">{normalized.name}</p>
                            <p className="mt-1 text-xs text-gray-500">{formatMoney(normalized.price)}</p>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                addItem({ id: normalized.id, name: normalized.name, price: normalized.price, image: normalized.image, quantity: 1 });
                              }}
                              className="mt-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white hover:bg-orange-600"
                            >
                              + Add
                            </button>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mb-5 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="text-xl font-extrabold text-gray-900">{formatMoney(subtotal)}</span>
              </div>
              <Link href="/checkout" onClick={() => setIsOpen(false)} className="block w-full rounded-md bg-orange-500 py-3 text-center text-sm font-bold uppercase text-white hover:bg-orange-600">
                Checkout
              </Link>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
