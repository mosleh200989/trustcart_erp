import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { FaPhone, FaEnvelope, FaUser, FaShoppingCart, FaHeart, FaBars, FaSearch, FaTimes } from 'react-icons/fa';
import { auth } from '@/services/api';
import apiClient from '@/services/api';

export default function ElectroNavbar() {
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartCount(cart.length);

    const initUser = async () => {
      try {
        const current = await auth.getCurrentUser();
        if (current && (current as any).roleSlug === 'customer-account') {
          setUser(current);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    initUser();

    const handleCartUpdate = () => {
      const updatedCart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(updatedCart.length);
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await apiClient.get(`/products/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Top Bar */}
      <div className="bg-gray-800 text-white text-sm hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <FaPhone size={12} />
                +880 1707-653536
              </span>
              <span className="flex items-center gap-2">
                <FaEnvelope size={12} />
                support@trustcart.com
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/about" className="hover:text-orange-400 transition">About</Link>
              <Link href="/contact" className="hover:text-orange-400 transition">Contact</Link>
              <Link href="/careers" className="hover:text-orange-400 transition">Careers</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden text-gray-700 hover:text-orange-500"
            >
              {showMobileMenu ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <div className="text-2xl lg:text-3xl font-bold">
                <span className="text-orange-500">Trust</span>
                <span className="text-gray-800">Cart</span>
              </div>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                  placeholder="Search for products..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:border-orange-500"
                />
                <button type="submit" className="absolute right-0 top-0 h-full px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-r-full transition">
                  <FaSearch />
                </button>
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                    {searchResults.map((product) => (
                      <Link
                        key={product.id}
                        href={product.slug ? `/products/${product.slug}` : `/products/${product.id}`}
                        onClick={() => {
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="flex items-center gap-4 p-4 hover:bg-orange-50 border-b last:border-b-0 transition"
                      >
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name_en}
                            className="w-16 h-16 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=No+Image';
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{product.name_en}</h4>
                          {product.category_name && (
                            <p className="text-xs text-gray-500">{product.category_name}</p>
                          )}
                          <p className="text-orange-600 font-bold mt-1">৳{parseFloat(product.base_price || product.price).toFixed(2)}</p>
                        </div>
                        {product.stock_quantity > 0 ? (
                          <span className="text-green-600 text-sm font-semibold">In Stock</span>
                        ) : (
                          <span className="text-red-600 text-sm font-semibold">Out of Stock</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 lg:gap-6">
              <Link href="/wishlist" className="hidden sm:flex flex-col items-center text-gray-700 hover:text-orange-500 transition">
                <FaHeart size={20} className="lg:w-6 lg:h-6" />
                <span className="text-xs mt-1 hidden lg:block">Wishlist</span>
              </Link>
              
              {user ? (
                <Link href="/customer/dashboard" className="hidden sm:flex flex-col items-center text-gray-700 hover:text-orange-500 transition">
                  <FaUser size={20} className="lg:w-6 lg:h-6" />
                  <span className="text-xs mt-1 hidden lg:block">My Account</span>
                </Link>
              ) : (
                <Link href="/customer/login" className="hidden sm:flex flex-col items-center text-gray-700 hover:text-orange-500 transition">
                  <FaUser size={20} className="lg:w-6 lg:h-6" />
                  <span className="text-xs mt-1 hidden lg:block">Sign In</span>
                </Link>
              )}

              <Link href="/cart" className="flex flex-col items-center text-gray-700 hover:text-orange-500 transition relative">
                <FaShoppingCart size={20} className="lg:w-6 lg:h-6" />
                <span className="text-xs mt-1 hidden lg:block">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search Bar - Mobile */}
          <div className="lg:hidden mt-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                placeholder="Search for products..."
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-full focus:outline-none focus:border-orange-500"
              />
              <button type="submit" className="absolute right-0 top-0 h-full px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-r-full transition">
                <FaSearch size={16} />
              </button>
              
              {/* Mobile Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                  {searchResults.map((product) => (
                    <Link
                      key={product.id}
                      href={product.slug ? `/products/${product.slug}` : `/products/${product.id}`}
                      onClick={() => {
                        setShowSearchResults(false);
                        setSearchQuery('');
                        setShowMobileMenu(false);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-orange-50 border-b last:border-b-0 transition"
                    >
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name_en}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=No+Image';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 text-sm truncate">{product.name_en}</h4>
                        <p className="text-orange-600 font-bold text-sm">৳{parseFloat(product.base_price || product.price).toFixed(2)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-gray-900 hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center">
            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onMouseEnter={() => setShowCategories(true)}
                onMouseLeave={() => setShowCategories(false)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 flex items-center gap-2 font-semibold transition"
              >
                <FaBars />
                ALL CATEGORIES
              </button>
              
              {showCategories && (
                <div
                  onMouseEnter={() => setShowCategories(true)}
                  onMouseLeave={() => setShowCategories(false)}
                  className="absolute top-full left-0 w-64 bg-white shadow-xl z-50"
                >
                  <Link href="/products?category=spices" className="block px-6 py-3 hover:bg-orange-50 hover:text-orange-500 transition border-b">
                    🌶️ Spices
                  </Link>
                  <Link href="/products?category=oils" className="block px-6 py-3 hover:bg-orange-50 hover:text-orange-500 transition border-b">
                    🛢️ Oils & Ghee
                  </Link>
                  <Link href="/products?category=dry-fruits" className="block px-6 py-3 hover:bg-orange-50 hover:text-orange-500 transition border-b">
                    🥜 Dry Fruits & Nuts
                  </Link>
                  <Link href="/products?category=beverages" className="block px-6 py-3 hover:bg-orange-50 hover:text-orange-500 transition border-b">
                    ☕ Beverages
                  </Link>
                  <Link href="/products?category=honey" className="block px-6 py-3 hover:bg-orange-50 hover:text-orange-500 transition border-b">
                    🍯 Honey & Sweet
                  </Link>
                  <Link href="/products?category=dairy" className="block px-6 py-3 hover:bg-orange-50 hover:text-orange-500 transition">
                    🥛 Dairy Products
                  </Link>
                </div>
              )}
            </div>

            {/* Menu Links */}
            <nav className="flex items-center gap-8 ml-8 text-white">
              <Link href="/" className="py-4 hover:text-orange-400 transition font-medium">
                Home
              </Link>
              <Link href="/products" className="py-4 hover:text-orange-400 transition font-medium">
                Products
              </Link>
              <Link href="/about" className="py-4 hover:text-orange-400 transition font-medium">
                About Us
              </Link>
              <Link href="/contact" className="py-4 hover:text-orange-400 transition font-medium">
                Contact
              </Link>
              <Link href="/blog" className="py-4 hover:text-orange-400 transition font-medium">
                Blog
              </Link>
            </nav>

            {/* Special Offer Badge */}
            <div className="ml-auto">
              <span className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold animate-pulse">
                🔥 Special Offers
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="lg:hidden bg-gray-900 text-white">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col space-y-2">
              <Link href="/" onClick={() => setShowMobileMenu(false)} className="py-3 px-4 hover:bg-orange-500 rounded transition">
                Home
              </Link>
              <Link href="/products" onClick={() => setShowMobileMenu(false)} className="py-3 px-4 hover:bg-orange-500 rounded transition">
                Products
              </Link>
              <Link href="/about" onClick={() => setShowMobileMenu(false)} className="py-3 px-4 hover:bg-orange-500 rounded transition">
                About Us
              </Link>
              <Link href="/contact" onClick={() => setShowMobileMenu(false)} className="py-3 px-4 hover:bg-orange-500 rounded transition">
                Contact
              </Link>
              <Link href="/blog" onClick={() => setShowMobileMenu(false)} className="py-3 px-4 hover:bg-orange-500 rounded transition">
                Blog
              </Link>
              <Link href="/wishlist" onClick={() => setShowMobileMenu(false)} className="py-3 px-4 hover:bg-orange-500 rounded transition sm:hidden">
                Wishlist
              </Link>
              {user ? (
                <Link href="/customer/dashboard" onClick={() => setShowMobileMenu(false)} className="py-3 px-4 hover:bg-orange-500 rounded transition sm:hidden">
                  My Account
                </Link>
              ) : (
                <Link href="/customer/login" onClick={() => setShowMobileMenu(false)} className="py-3 px-4 hover:bg-orange-500 rounded transition sm:hidden">
                  Sign In
                </Link>
              )}
              
              {/* Mobile Categories */}
              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2 px-4">Categories</p>
                <Link href="/products?category=spices" onClick={() => setShowMobileMenu(false)} className="py-2 px-4 hover:bg-orange-500 rounded transition block">
                  🌶️ Spices
                </Link>
                <Link href="/products?category=oils" onClick={() => setShowMobileMenu(false)} className="py-2 px-4 hover:bg-orange-500 rounded transition block">
                  🛢️ Oils & Ghee
                </Link>
                <Link href="/products?category=dry-fruits" onClick={() => setShowMobileMenu(false)} className="py-2 px-4 hover:bg-orange-500 rounded transition block">
                  🥜 Dry Fruits & Nuts
                </Link>
                <Link href="/products?category=beverages" onClick={() => setShowMobileMenu(false)} className="py-2 px-4 hover:bg-orange-500 rounded transition block">
                  ☕ Beverages
                </Link>
                <Link href="/products?category=honey" onClick={() => setShowMobileMenu(false)} className="py-2 px-4 hover:bg-orange-500 rounded transition block">
                  🍯 Honey & Sweet
                </Link>
                <Link href="/products?category=dairy" onClick={() => setShowMobileMenu(false)} className="py-2 px-4 hover:bg-orange-500 rounded transition block">
                  🥛 Dairy Products
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
