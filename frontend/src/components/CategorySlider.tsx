import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface Category {
  id: number;
  name_en: string;
  name_bn: string;
  slug: string;
  image_url: string;
}

interface CategorySliderProps {
  categories: Category[];
}

export default function CategorySlider({ categories }: CategorySliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsToShow, setItemsToShow] = useState(6);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsToShow(2);
      } else if (window.innerWidth < 768) {
        setItemsToShow(3);
      } else if (window.innerWidth < 1024) {
        setItemsToShow(4);
      } else {
        setItemsToShow(6);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, categories.length - itemsToShow);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [currentIndex, maxIndex]);

  return (
    <div className="relative px-12">
      {/* Navigation Arrows */}
      {categories.length > itemsToShow && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-orange-500 text-gray-700 hover:text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous category"
            disabled={currentIndex === 0}
          >
            <FaChevronLeft size={20} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-orange-500 text-gray-700 hover:text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next category"
            disabled={currentIndex >= maxIndex}
          >
            <FaChevronRight size={20} />
          </button>
        </>
      )}

      {/* Categories Container with Overflow */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateX(-${(currentIndex * 100) / itemsToShow}%)`
          }}
        >
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex-shrink-0 px-2"
              style={{ width: `${100 / itemsToShow}%` }}
            >
              <Link
                href={`/products?category=${cat.slug}`}
                className="block group bg-white hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100 p-6 rounded-lg text-center transition-all duration-300 hover:shadow-lg border border-gray-200 h-full"
              >
                {cat.image_url && (
                  <div className="mb-4 overflow-hidden rounded-lg">
                    <img
                      src={cat.image_url}
                      alt={cat.name_en}
                      crossOrigin="anonymous"
                      className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        console.error('Category image failed to load:', cat.image_url);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <h3 className="text-gray-800 font-bold text-sm group-hover:text-orange-600 transition-colors">
                  {cat.name_en}
                </h3>
                {cat.name_bn && (
                  <p className="text-xs text-gray-500 mt-1">{cat.name_bn}</p>
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      {categories.length > itemsToShow && (
        <div className="flex justify-center gap-2 mt-6">
          {[...Array(maxIndex + 1)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-orange-500'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to position ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
