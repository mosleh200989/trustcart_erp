import { useState, useEffect } from 'react';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import ElectroProductCard from '@/components/ElectroProductCard';
import apiClient from '@/services/api';

export default function Blog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    loadBlogData();
    loadProducts();
  }, []);

  const loadBlogData = async () => {
    try {
      setLoading(true);
      const [postsRes, categoriesRes, tagsRes] = await Promise.all([
        apiClient.get('/blog/posts'),
        apiClient.get('/blog/categories'),
        apiClient.get('/blog/tags')
      ]);
      
      setPosts(postsRes.data || []);
      setCategories(categoriesRes.data || []);
      setTags(tagsRes.data || []);
    } catch (error) {
      console.error('Error loading blog data:', error);
      setPosts([]);
      setCategories([]);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      const productsData = response.data || [];
      const shuffled = [...productsData].sort(() => 0.5 - Math.random());
      setRelatedProducts(shuffled.slice(0, 4));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const filterByCategory = async (categorySlug: string) => {
    setSelectedCategory(categorySlug === selectedCategory ? '' : categorySlug);
    setSelectedTag('');
  };

  const filterByTag = async (tagSlug: string) => {
    setSelectedTag(tagSlug === selectedTag ? '' : tagSlug);
    setSelectedCategory('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />
      
      {/* Breadcrumb */}
      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm">
            <a href="/" className="text-gray-600 hover:text-orange-500">Home</a>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-semibold">Blog</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Our Blog</h1>
          <p className="text-xl text-gray-600">Tips, advice, and insights for a healthier lifestyle</p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading blog posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600">No blog posts available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    {post.featured_image && (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-medium">
                          {post.category?.name || post.category_name || 'Uncategorized'}
                        </span>
                        <span></span>
                        <span>{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-xl font-bold mb-3 hover:text-orange-500 transition-colors">
                        <a href={`/blog/${post.slug}`}>{post.title}</a>
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {post.author?.avatar && (
                            <img
                              src={post.author.avatar}
                              alt={post.author.name}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <span className="text-sm text-gray-700">{post.author?.name || 'Admin'}</span>
                        </div>
                        <a
                          href={`/blog/${post.slug}`}
                          className="text-orange-500 font-semibold hover:text-orange-600 transition-colors"
                        >
                          Read More 
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Categories */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4 pb-3 border-b border-gray-200">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => filterByCategory(category.slug)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.slug
                        ? 'bg-orange-500 text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {category.name} ({category.post_count || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4 pb-3 border-b border-gray-200">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => filterByTag(tag.slug)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedTag === tag.slug
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-4 pb-3 border-b border-gray-200">Featured Products</h3>
                <div className="space-y-4">
                  {relatedProducts.map((product) => (
                    <ElectroProductCard
                      key={product.id}
                      id={product.id}
                      slug={product.slug}
                      name={product.name_en || product.name}
                      nameBn={product.name_bn}
                      nameEn={product.name_en}
                      categoryName={
                        product.category_name ||
                        product.category?.name_en ||
                        product.category?.name
                      }
                      price={(() => {
                        const basePrice = product.base_price ?? product.price ?? 0;
                        const salePrice = product.sale_price ?? product.salePrice;
                        const hasDiscount =
                          typeof salePrice === 'number' &&
                          typeof basePrice === 'number' &&
                          salePrice > 0 &&
                          salePrice < basePrice;
                        return hasDiscount ? salePrice : basePrice;
                      })()}
                      originalPrice={(() => {
                        const basePrice = product.base_price ?? product.price;
                        const salePrice = product.sale_price ?? product.salePrice;
                        const hasDiscount =
                          typeof salePrice === 'number' &&
                          typeof basePrice === 'number' &&
                          salePrice > 0 &&
                          salePrice < basePrice;
                        return hasDiscount ? basePrice : undefined;
                      })()}
                      stock={product.stock_quantity}
                      image={product.image_url}
                      rating={5}
                      reviews={0}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ElectroFooter />
    </div>
  );
}
