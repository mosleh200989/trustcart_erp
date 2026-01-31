import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ElectroNavbar from "@/components/ElectroNavbar";
import ElectroFooter from "@/components/ElectroFooter";
import ElectroProductCard from "@/components/ElectroProductCard";
import { FaThLarge, FaThList, FaFilter } from "react-icons/fa";
import apiClient from "@/services/api";

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
  base_price: number;
  mrp?: number;
  stock_quantity?: number;
  category_name?: string;
  image?: string;
  image_url?: string;
}

export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "featured",
    inStock: false,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // Handle URL query parameters
  useEffect(() => {
    if (router.isReady && router.query.category) {
      const categorySlug = router.query.category as string;
      // Find category by slug and set filter
      const category = categories.find((cat) => cat.slug === categorySlug);
      if (category) {
        setFilters((prev) => ({ ...prev, category: category.name_en }));
      }
    }
  }, [router.isReady, router.query.category, categories]);

  useEffect(() => {
    applyFilters();
  }, [products, filters]);

  const loadProducts = async () => {
    try {
      const response = await apiClient.get("/products");
      const allProducts = Array.isArray(response.data) ? response.data : [];
      console.log("Products page loaded:", allProducts.length);
      // Show all products (stock filter removed)
      setProducts(allProducts);
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiClient.get("/products/categories");
      const cats = Array.isArray(response.data) ? response.data : [];
      console.log("Categories loaded:", cats);
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    if (filters.search) {
      filtered = filtered.filter(
        (p) =>
          p.name_en?.toLowerCase().includes(filters.search.toLowerCase()) ||
          p.name_bn?.includes(filters.search)
      );
    }

    if (filters.category) {
      filtered = filtered.filter((p) => p.category_name === filters.category);
    }

    if (filters.minPrice) {
      filtered = filtered.filter(
        (p) => p.base_price >= parseFloat(filters.minPrice)
      );
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(
        (p) => p.base_price <= parseFloat(filters.maxPrice)
      );
    }

    if (filters.inStock) {
      filtered = filtered.filter((p) => (p.stock_quantity || 0) > 0);
    }

    // Sorting
    switch (filters.sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.base_price - b.base_price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.base_price - a.base_price);
        break;
      case "name":
        filtered.sort((a, b) => a.name_en.localeCompare(b.name_en));
        break;
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const FiltersPanel = () => (
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
                <FiltersPanel />
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block lg:w-72 lg:flex-shrink-0">
              <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-4">
                <FiltersPanel />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-gray-600">
                  Showing{" "}
                  <span className="font-semibold text-gray-900">
                    {paginatedProducts.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900">
                    {filteredProducts.length}
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
                <div className="text-center py-20">
                  <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
                  <p className="mt-4 text-gray-600">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
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
                    {paginatedProducts.map((product) => (
                      <ElectroProductCard
                        key={product.id}
                        id={product.id}
                        nameEn={product.name_en}
                        nameBn={product.name_bn}
                        categoryName={product.category_name}
                        price={product.base_price}
                        originalPrice={product.mrp}
                        stock={product.stock_quantity}
                        image={product.image || product.image_url}
                        rating={5}
                        reviews={Math.floor(Math.random() * 200)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex flex-wrap justify-center items-center gap-2">
                      <button
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 sm:px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-orange-500 hover:text-white hover:border-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>

                      {[...Array(totalPages)].map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(idx + 1)}
                          className={`px-3 sm:px-4 py-2 text-sm rounded-lg transition ${
                            currentPage === idx + 1
                              ? "bg-orange-500 text-white"
                              : "bg-white border border-gray-300 hover:bg-orange-500 hover:text-white hover:border-orange-500"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}

                      <button
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 sm:px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-orange-500 hover:text-white hover:border-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
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
