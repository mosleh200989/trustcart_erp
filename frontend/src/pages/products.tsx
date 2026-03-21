import { useEffect, useState, useRef, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import ElectroProductCard from "@/components/ElectroProductCard";
import { FaThLarge, FaThList, FaFilter } from "react-icons/fa";
import apiClient from "@/services/api";
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE, canonicalUrl } from '@/config/seo';

interface Category {
  id: number;
  name_en: string;
  name_bn: string;
  slug: string;
}

interface Product {
  id: number;
  name_en: string;
  name_bn: string;
  slug?: string;
  base_price: number;
  sale_price?: number;
  mrp?: number;
  discount_value?: number;
  discount_type?: string;
  stock_quantity?: number;
  category_name?: string;
  category?: { name_en?: string; name?: string };
  image?: string;
  image_url?: string;
  // calculated fields
  salePrice?: number;
  discountPercent?: number;
  hasDiscount?: boolean;
}

export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "featured",
    inStock: false,
  });

  const isUpdatingFromUrl = useRef(false);
  const prevFiltersRef = useRef(filters);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const filtersInitialized = useRef(false);

  // Build query params for server-side API
  const buildQueryParams = useCallback((page: number, filtersOverride?: typeof filters) => {
    const f = filtersOverride ?? filters;
    const params: Record<string, string> = {
      page: page.toString(),
      limit: itemsPerPage.toString(),
    };
    if (f.search) params.search = f.search;
    if (f.category) {
      const cat = categories.find((c) => c.name_en === f.category);
      if (cat) params.category = cat.slug;
    }
    if (f.sortBy && f.sortBy !== "featured") params.sort = f.sortBy;
    if (f.minPrice) params.minPrice = f.minPrice;
    if (f.maxPrice) params.maxPrice = f.maxPrice;
    if (f.inStock) params.inStock = "true";
    return params;
  }, [filters, categories, itemsPerPage]);

  // Fetch products from server (paginated)
  const fetchProducts = useCallback(async (page: number, append: boolean, filtersOverride?: typeof filters) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const params = buildQueryParams(page, filtersOverride);
      const queryString = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/products?${queryString}`);
      const result = response.data;

      const newProducts = (result.data || []).map((p: any) => {
        const basePrice = parseFloat(p.base_price) || 0;
        let salePrice = p.sale_price ? parseFloat(p.sale_price) : null;
        let discountPercent = 0;
        if (salePrice && salePrice < basePrice) {
          discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);
        } else if (p.discount_value && p.discount_type) {
          const discountValue = parseFloat(p.discount_value) || 0;
          if (p.discount_type === "percentage") {
            salePrice = basePrice - (basePrice * discountValue) / 100;
            discountPercent = Math.round(discountValue);
          } else if (p.discount_type === "flat") {
            salePrice = basePrice - discountValue;
            discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);
          }
        }
        return { ...p, base_price: basePrice, salePrice, discountPercent, hasDiscount: !!salePrice && salePrice < basePrice };
      });

      if (append) {
        setProducts((prev) => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }
      setTotalProducts(result.total || 0);
      setHasMore(page < (result.totalPages || 0));
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to load products:", error);
      if (!append) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildQueryParams]);

  const loadCategories = async () => {
    try {
      const response = await apiClient.get("/products/categories");
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Sync URL query params → component state (runs once when router + categories are ready)
  useEffect(() => {
    if (!router.isReady || categories.length === 0) return;
    if (filtersInitialized.current) return;
    filtersInitialized.current = true;

    isUpdatingFromUrl.current = true;

    const updates: Partial<typeof filters> = {};

    if (router.query.category) {
      const categorySlug = router.query.category as string;
      const category = categories.find((cat) => cat.slug === categorySlug);
      if (category) updates.category = category.name_en;
    }
    if (router.query.sort) updates.sortBy = router.query.sort as string;
    if (router.query.search) updates.search = router.query.search as string;
    if (router.query.minPrice) updates.minPrice = router.query.minPrice as string;
    if (router.query.maxPrice) updates.maxPrice = router.query.maxPrice as string;
    if (router.query.inStock === "true") updates.inStock = true;

    const initialFilters = { ...filters, ...updates };
    setFilters(initialFilters);
    prevFiltersRef.current = initialFilters;

    // Fetch first page with initial filters
    fetchProducts(1, false, initialFilters);

    setTimeout(() => { isUpdatingFromUrl.current = false; }, 0);
  }, [router.isReady, categories]);

  // Sync component state → URL query params + re-fetch when filters change
  const updateUrl = useCallback(
    (filtersOverride?: typeof filters) => {
      if (isUpdatingFromUrl.current || !router.isReady) return;

      const f = filtersOverride ?? filters;
      const query: Record<string, string> = {};

      if (f.search) query.search = f.search;
      if (f.category) {
        const cat = categories.find((c) => c.name_en === f.category);
        if (cat) query.category = cat.slug;
      }
      if (f.sortBy && f.sortBy !== "featured") query.sort = f.sortBy;
      if (f.minPrice) query.minPrice = f.minPrice;
      if (f.maxPrice) query.maxPrice = f.maxPrice;
      if (f.inStock) query.inStock = "true";

      router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
    },
    [router, filters, categories]
  );

  // When filters change, reset to page 1 and fetch (debounced for search/price typing)
  useEffect(() => {
    if (!filtersInitialized.current) return;

    const filtersChanged =
      prevFiltersRef.current.search !== filters.search ||
      prevFiltersRef.current.category !== filters.category ||
      prevFiltersRef.current.minPrice !== filters.minPrice ||
      prevFiltersRef.current.maxPrice !== filters.maxPrice ||
      prevFiltersRef.current.sortBy !== filters.sortBy ||
      prevFiltersRef.current.inStock !== filters.inStock;

    if (filtersChanged && !isUpdatingFromUrl.current) {
      const timeout = setTimeout(() => {
        prevFiltersRef.current = filters;
        fetchProducts(1, false);
        updateUrl();
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [filters, fetchProducts, updateUrl]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchProducts(currentPage + 1, true);
        }
      },
      { rootMargin: "200px" }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, loadingMore, currentPage, fetchProducts]);

  // Skeleton component for loading state
  const ProductCardSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
      <div className="animate-pulse">
        <div className="bg-gray-200 h-40 sm:h-48 lg:h-52" />
        <div className="p-3 space-y-2">
          <div className="bg-gray-200 h-3 rounded w-1/3" />
          <div className="bg-gray-200 h-4 rounded w-3/4" />
          <div className="bg-gray-200 h-3 rounded w-1/2" />
          <div className="flex justify-between items-center pt-1">
            <div className="bg-gray-200 h-5 rounded w-1/4" />
            <div className="bg-gray-200 h-8 rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );

  const SkeletonGrid = ({ count = 6 }: { count?: number }) => (
    <div className={`grid gap-2 sm:gap-4 lg:gap-6 ${
      viewMode === "grid" ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
    }`}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );

  const filtersContent = (
    <>
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <FaFilter className="text-orange-500" />
        Filters
      </h3>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">Search</label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search products..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Categories */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-3">Categories</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer hover:text-orange-500">
            <input
              type="radio"
              name="category"
              checked={filters.category === ""}
              onChange={() => setFilters({ ...filters, category: "" })}
              className="text-orange-500"
            />
            <span className="text-sm">All Categories</span>
          </label>
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2 cursor-pointer hover:text-orange-500"
            >
              <input
                type="radio"
                name="category"
                checked={filters.category === cat.name_en}
                onChange={() => setFilters({ ...filters, category: cat.name_en })}
                className="text-orange-500"
              />
              <span className="text-sm">
                {cat.name_en}
                {cat.name_bn && (
                  <span className="text-gray-500 ml-1">({cat.name_bn})</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-3">Price Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            placeholder="Min"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
          />
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            placeholder="Max"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Stock */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => setFilters({ ...filters, inStock: e.target.checked })}
            className="text-orange-500"
          />
          <span className="text-sm font-semibold">In Stock Only</span>
        </label>
      </div>

      {/* Reset */}
      <button
        onClick={() =>
          setFilters({
            search: "",
            category: "",
            minPrice: "",
            maxPrice: "",
            sortBy: "featured",
            inStock: false,
          })
        }
        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold transition"
      >
        Reset Filters
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Shop All Products | {SITE_NAME}</title>
        <meta name="description" content={`Browse our collection of premium organic groceries, spices, ghee, honey & healthy food at ${SITE_NAME}. Best prices with home delivery in Bangladesh.`} />
        <link rel="canonical" href={canonicalUrl('/products')} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Shop All Products | ${SITE_NAME}`} />
        <meta property="og:description" content={`Browse our collection of premium organic groceries, spices, ghee, honey & healthy food at ${SITE_NAME}.`} />
        <meta property="og:url" content={canonicalUrl('/products')} />
        <meta property="og:image" content={DEFAULT_OG_IMAGE} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <ElectroNavbar />
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="bg-gray-100 border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="text-sm text-gray-600">
              Home /{" "}
              <span className="text-gray-900 font-semibold">Products</span>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Mobile Filters Drawer */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                aria-label="Close filters"
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-bold">Filters</div>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    Close
                  </button>
                </div>
                {filtersContent}
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block lg:w-72 lg:flex-shrink-0">
              <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-4">
                {filtersContent}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-gray-600">
                  Showing{" "}
                  <span className="font-semibold text-gray-900">
                    {products.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900">
                    {totalProducts}
                  </span>{" "}
                  products
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {/* Mobile Filters */}
                  <button
                    onClick={() => setMobileFiltersOpen(true)}
                    className="lg:hidden inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    <FaFilter />
                    Filters
                  </button>

                  {/* Sort */}
                  <select
                    value={filters.sortBy}
                    onChange={(e) =>
                      setFilters({ ...filters, sortBy: e.target.value })
                    }
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="discount">Biggest Discount</option>
                    <option value="name">Name: A to Z</option>
                  </select>

                  {/* View Mode */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded ${
                        viewMode === "grid"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      <FaThLarge />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded ${
                        viewMode === "list"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      <FaThList />
                    </button>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              {loading ? (
                <SkeletonGrid count={6} />
              ) : products.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    No Products Found
                  </h3>
                  <p className="text-gray-600">Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  <div
                    className={`grid gap-2 sm:gap-4 lg:gap-6 ${
                      viewMode === "grid"
                        ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3"
                        : "grid-cols-1"
                    }`}
                  >
                    {products.map((product) => (
                      <ElectroProductCard
                        key={product.id}
                        id={product.id}
                        slug={product.slug}
                        name={product.name_en}
                        nameEn={product.name_en}
                        nameBn={product.name_bn}
                        categoryName={
                          product.category_name ||
                          product.category?.name_en ||
                          product.category?.name
                        }
                        price={
                          product.hasDiscount
                            ? product.salePrice!
                            : product.base_price
                        }
                        originalPrice={
                          product.hasDiscount
                            ? product.base_price
                            : undefined
                        }
                        stock={product.stock_quantity}
                        image={product.image_url || product.image}
                        rating={5}
                        discount={
                          product.hasDiscount ? product.discountPercent : undefined
                        }
                      />
                    ))}
                  </div>

                  {/* Loading more skeleton */}
                  {loadingMore && (
                    <div className="mt-6">
                      <SkeletonGrid count={3} />
                    </div>
                  )}

                  {/* Infinite scroll sentinel */}
                  {hasMore && !loadingMore && (
                    <div ref={sentinelRef} className="h-4" />
                  )}

                  {/* End of results */}
                  {!hasMore && products.length > 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      You&apos;ve seen all {totalProducts} products
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <ElectroFooter />
    </div>
  );
}
