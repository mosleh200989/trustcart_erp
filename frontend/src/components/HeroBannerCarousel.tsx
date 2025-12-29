import { useState, useEffect } from 'react';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, banners.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  if (!banners || banners.length === 0) {
    return (
      <div className="bg-gradient-to-r from-orange-400 to-red-500 h-96 flex items-center justify-center">
        <p className="text-white text-xl">No banners available</p>
      </div>
    );
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative overflow-hidden group">
      {/* Carousel Container */}
      <a 
        href={currentBanner.button_link || '#'}
        className="block relative h-96 transition-all duration-700 ease-in-out cursor-pointer"
      >
        {/* Banner Image */}
        <img
          src={currentBanner.image_url}
          alt={currentBanner.title}
          crossOrigin="anonymous"
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          onError={(e) => {
            console.error('Banner image failed to load:', currentBanner.image_url);
          }}
        />
      </a>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 backdrop-blur-sm p-4 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 z-20"
            aria-label="Previous slide"
          >
            <FaChevronLeft className="text-white text-2xl" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 backdrop-blur-sm p-4 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 z-20"
            aria-label="Next slide"
          >
            <FaChevronRight className="text-white text-2xl" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-white w-8 h-3 shadow-lg'
                  : 'bg-white/60 hover:bg-white/90 w-3 h-3'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
