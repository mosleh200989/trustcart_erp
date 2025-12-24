import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import ElectroProductCard from '@/components/ElectroProductCard';
import apiClient from '@/services/api';
import { FaStar, FaShoppingCart, FaHeart, FaShareAlt } from 'react-icons/fa';

export default function ProductDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      // Check if id is a number (ID) or string (slug)
      const isNumericId = !isNaN(Number(id));
      const endpoint = isNumericId ? `/products/${id}` : `/products/by-slug/${id}`;
      
      const response = await apiClient.get(endpoint);
      setProduct(response.data);
      
      // Load related products using the product ID
      try {
        const productId = response.data.id;
        const relatedResponse = await apiClient.get(`/products/related/${productId}`);
        setRelatedProducts(relatedResponse.data || []);
      } catch (error) {
        console.error('Error loading related products:', error);
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find((item: any) => item.id === product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name_en,
        name_en: product.name_en,
        price: product.base_price,
        quantity: quantity,
        image: product.image_url
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`Added ${quantity} item(s) to cart!`);
  };

  const handleAddToWishlist = () => {
    if (!product) return;
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Please login to add items to your wishlist.');
      router.push('/customer/login');
      return;
    }

    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    if (!wishlist.find((item: any) => item.id === product.id)) {
      wishlist.push({
        id: product.id,
        name: product.name_en || product.name_bn || product.name,
        price: product.base_price || product.price,
        image: product.image_url,
      });
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
      window.dispatchEvent(new Event('wishlistUpdated'));
      alert('Added to your wishlist.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <ElectroNavbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-xl">Loading product...</p>
        </div>
        <ElectroFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <ElectroNavbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600"
          >
            Go to Homepage
          </button>
        </div>
        <ElectroFooter />
      </div>
    );
  }

  const displayName = product.name_en || product.name_bn || 'Product';
  const price = Number(product.base_price || product.price || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-600 mb-6">
          <span onClick={() => router.push('/')} className="cursor-pointer hover:text-orange-500">Home</span>
          <span className="mx-2">/</span>
          <span onClick={() => router.push('/products')} className="cursor-pointer hover:text-orange-500">Products</span>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{displayName}</span>
        </div>

        {/* Product Details */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Product Image */}
            <div>
              <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <FaShoppingCart className="text-6xl mx-auto mb-2" />
                      <p>No Image</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{displayName}</h1>
              
              {/* Rating */}
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400 mr-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar key={star} className="text-sm" />
                  ))}
                </div>
                <span className="text-gray-600 text-sm">(125 reviews)</span>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="text-4xl font-bold text-orange-500 mb-2">
                  ৳{price.toFixed(2)}
                </div>
                {product.sku && (
                  <p className="text-gray-600 text-sm">SKU: {product.sku}</p>
                )}
              </div>

              {/* Description */}
              {product.description_en && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-700">{product.description_en}</p>
                </div>
              )}

              {/* Stock Status */}
              <div className="mb-6">
                <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  In Stock
                </span>
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Quantity</label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 h-10 border border-gray-300 rounded-lg text-center"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 flex items-center justify-center space-x-2 font-semibold"
                >
                  <FaShoppingCart />
                  <span>Add to Cart</span>
                </button>
                <button
                  onClick={handleAddToWishlist}
                  className="w-12 h-12 border-2 border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 flex items-center justify-center"
                >
                  <FaHeart />
                </button>
                <button className="w-12 h-12 border-2 border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 flex items-center justify-center">
                  <FaShareAlt />
                </button>
              </div>

              {/* Additional Info */}
              <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                {product.category_name && (
                  <p><span className="font-semibold">Category:</span> {product.category_name}</p>
                )}
                {product.brand && (
                  <p><span className="font-semibold">Brand:</span> {product.brand}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((relatedProduct) => (
                <ElectroProductCard
                  key={relatedProduct.id}
                  id={relatedProduct.id}
                  name_en={relatedProduct.name_en}
                  name_bn={relatedProduct.name_bn}
                  price={relatedProduct.base_price || relatedProduct.price}
                  image={relatedProduct.image_url}
                  rating={5}
                  reviews={0}
                  inStock={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ElectroFooter />
    </div>
  );
}
