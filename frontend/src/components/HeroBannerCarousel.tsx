import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  button_text: string;
  button_link: string;
  image_url: string;
  background_color: string;
  text_color: string;
}

interface Props {
  banners: Banner[];
}

export default function HeroBannerCarousel({ banners }: Props) {
  const resumeTimerRef = useRef<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const pauseAutoPlay = () => {
    setIsAutoPlaying(false);
    if (resumeTimerRef.current != null) {
      window.clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = window.setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  useEffect(() => {
    if (!isAutoPlaying || banners.length <= 1) return;

    const interval = setInterval(() => {
      const next = (currentIndex + 1) % banners.length;
      setCurrentIndex(next);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length, currentIndex]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current != null) {
        window.clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    pauseAutoPlay();
  };

  const goToPrevious = () => {
    const prevIndex = (currentIndex - 1 + banners.length) % banners.length;
    setCurrentIndex(prevIndex);
    pauseAutoPlay();
  };

  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % banners.length;
    setCurrentIndex(nextIndex);
    pauseAutoPlay();
  };

  if (!banners || banners.length === 0) {
    return (
      <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96 bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
        <p className="text-white text-xl">No banners available</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden group bg-gray-100">
      {/* Swipeable Carousel Track */}
      <div
        className="hero-banner-scroller flex"
        style={{ transform: `translate3d(-${currentIndex * 100}%, 0, 0)` }}
      >
        {banners.map((banner) => (
          <a
            key={banner.id}
            href={banner.button_link || '#'}
            className="block relative w-full flex-none cursor-pointer h-48 sm:h-64 md:h-80 lg:h-96"
            onPointerDown={() => {
              if (banners.length > 1) {
                pauseAutoPlay();
              }
            }}
            onTouchStart={() => {
              if (banners.length > 1) {
                pauseAutoPlay();
              }
            }}
          >
            <Image
              src={banner.image_url}
              alt={banner.title}
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              priority={true}
              className="object-cover object-center"
              onError={() => {
                console.error('Banner image failed to load:', banner.image_url);
              }}
            />
          </a>
        ))}
      </div>

      {/* Navigation Arrows - visible on hover (desktop) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg p-2 sm:p-3 rounded-full transition-all duration-300 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 z-20"
            aria-label="Previous slide"
          >
            <FaChevronLeft className="text-gray-800 text-lg sm:text-xl" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg p-2 sm:p-3 rounded-full transition-all duration-300 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 z-20"
            aria-label="Next slide"
          >
            <FaChevronRight className="text-gray-800 text-lg sm:text-xl" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`rounded-full transition-all duration-300 shadow-sm ${
                index === currentIndex
                  ? 'bg-white w-6 sm:w-8 h-2 sm:h-2.5'
                  : 'bg-white/50 hover:bg-white/80 w-2 sm:w-2.5 h-2 sm:h-2.5'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
