import { useEffect, useMemo, useRef, useState } from 'react';
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
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const [isScrollable, setIsScrollable] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const scrollable = el.scrollWidth > el.clientWidth + 1;
    const currentPage = el.clientWidth > 0 ? Math.round(el.scrollLeft / el.clientWidth) : 0;
    const pages = el.clientWidth > 0 ? Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth)) : 1;

    setIsScrollable(scrollable);
    setCanScrollPrev(scrollable && el.scrollLeft > 0);
    setCanScrollNext(scrollable && el.scrollLeft < maxScrollLeft - 1);
    setPage(Math.min(Math.max(0, currentPage), pages - 1));
    setPageCount(pages);
  };

  const scrollToPage = (nextPage: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.min(Math.max(0, nextPage), pageCount - 1);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  };

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  // Auto-slide every 30 seconds (respects scroll boundaries)
  useEffect(() => {
    if (!isScrollable) return;
    const interval = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      if (el.scrollLeft >= maxScrollLeft - 1) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [isScrollable]);

  const dots = useMemo(() => Array.from({ length: pageCount }, (_, i) => i), [pageCount]);

  return (
    <div className="relative px-0 sm:px-12">
      {/* Navigation Arrows (hidden on mobile; swipe works there) */}
      {isScrollable && (
        <>
          <button
            onClick={() => scrollByPage(-1)}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'white', color: '#374151' }}
            onMouseEnter={(e) => {
              if (canScrollPrev) {
                e.currentTarget.style.backgroundColor = '#f97316';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#374151';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
            aria-label="Previous category"
            disabled={!canScrollPrev}
          >
            <FaChevronLeft size={20} />
          </button>
          <button
            onClick={() => scrollByPage(1)}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'white', color: '#374151' }}
            onMouseEnter={(e) => {
              if (canScrollNext) {
                e.currentTarget.style.backgroundColor = '#f97316';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#374151';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
            aria-label="Next category"
            disabled={!canScrollNext}
          >
            <FaChevronRight size={20} />
          </button>
        </>
      )}

      {/* Scrollable container: touch swipe left/right + snap */}
      <div
        ref={scrollerRef}
        className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory touch-pan-x overscroll-x-contain px-4 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex-none w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 snap-start"
          >
            <Link
              href={`/products?category=${cat.slug}`}
              className="block pb-4 group bg-white hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100 rounded-lg text-center transition-all duration-300 hover:shadow-lg border border-gray-200 h-full"
            >
              {cat.image_url && (
                <div className="mb-3 overflow-hidden rounded-lg">
                  <img
                    src={cat.image_url}
                    alt={cat.name_en}
                    crossOrigin="anonymous"
                    className="w-full h-44 object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      console.error('Category image failed to load:', cat.image_url);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <h3 className="text-gray-800 font-bold text-base group-hover:text-orange-600 transition-colors px-2">
                {cat.name_en}
              </h3>
              {cat.name_bn && <p className="text-sm text-gray-500 mt-1 px-2">{cat.name_bn}</p>}
            </Link>
          </div>
        ))}
      </div>

      {/* Dots Indicator */}
      {isScrollable && pageCount > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {dots.map((index) => (
            <button
              key={index}
              onClick={() => scrollToPage(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === page ? 'w-8 bg-orange-500' : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to position ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
