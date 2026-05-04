import { FaCheckSquare, FaRegSquare, FaTag, FaGift } from 'react-icons/fa';

interface CrossSellProduct {
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  compare_price?: number;
  product_id?: number;
  badge_text?: string;
  suggestion_text?: string;
}

interface CrossSellSuggestionProps {
  product: CrossSellProduct | null | undefined;
  isChecked: boolean;
  onToggle: (checked: boolean) => void;
  theme?: 'dark' | 'light';
  accentColor?: string;
}

export default function CrossSellSuggestion({
  product,
  isChecked,
  onToggle,
  theme = 'dark',
  accentColor,
}: CrossSellSuggestionProps) {
  // Don't render anything if no cross-sell product configured
  if (!product || !product.name) return null;

  const isDark = theme === 'dark';
  const accent = accentColor || (isDark ? '#22c55e' : '#16a34a');
  const badgeText = product.badge_text || '🎁 সাথে নিন';
  const suggestionText = product.suggestion_text || 'এটিও সাথে নিতে চাই';
  const discountPct =
    product.compare_price && product.compare_price > product.price
      ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
      : 0;

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div
          className={`
            relative rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer
            ${isChecked
              ? isDark
                ? 'border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.2)]'
                : 'border-green-500 shadow-lg'
              : isDark
                ? 'border-gray-700 hover:border-gray-500'
                : 'border-gray-200 hover:border-gray-400'
            }
          `}
          onClick={() => onToggle(!isChecked)}
          role="button"
          aria-pressed={isChecked}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(!isChecked); } }}
        >
          {/* Badge */}
          <div
            className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-sm font-bold z-10"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                : 'linear-gradient(135deg, #f59e0b, #ef4444)',
              color: '#fff',
            }}
          >
            {badgeText}
          </div>

          {/* Card Body */}
          <div
            className={`p-5 sm:p-6 ${isDark ? 'bg-gradient-to-r from-[#111a14] to-[#0f1612]' : 'bg-gradient-to-r from-green-50 to-emerald-50'}`}
            style={isDark ? { background: `linear-gradient(135deg, ${accent}08, ${accent}05)` } : undefined}
          >
            <div className="flex items-start gap-4 sm:gap-5">
              {/* Checkbox */}
              <div className="flex-shrink-0 mt-1">
                {isChecked ? (
                  <FaCheckSquare
                    className="text-2xl sm:text-3xl transition-transform duration-200"
                    style={{ color: accent, transform: 'scale(1.05)' }}
                  />
                ) : (
                  <FaRegSquare
                    className={`text-2xl sm:text-3xl transition-all duration-200 ${
                      isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'
                    }`}
                  />
                )}
              </div>

              {/* Product Image */}
              {product.image_url && (
                <div className="flex-shrink-0">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className={`
                      w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border-2 transition-all duration-300
                      ${isChecked
                        ? 'border-green-500/50 shadow-md'
                        : isDark ? 'border-gray-700' : 'border-gray-200'
                      }
                    `}
                  />
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                {/* Suggestion label */}
                <div className="flex items-center gap-2 mb-1.5">
                  <FaGift className={`text-xs flex-shrink-0 ${isChecked ? 'text-green-500' : isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className={`text-xs sm:text-sm font-medium ${isChecked ? 'text-green-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {suggestionText}
                  </span>
                </div>

                {/* Product name */}
                <h4 className={`text-base sm:text-lg font-bold leading-tight mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {product.name}
                </h4>

                {/* Description */}
                {product.description && (
                  <p className={`text-xs sm:text-sm leading-snug mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {product.description}
                  </p>
                )}

                {/* Price */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-lg sm:text-xl font-extrabold px-2 py-0.5 rounded"
                    style={{
                      color: accent,
                      backgroundColor: `${accent}15`,
                      border: `1px solid ${accent}30`,
                    }}
                  >
                    ৳{product.price.toLocaleString()}
                  </span>
                  {product.compare_price && product.compare_price > product.price && (
                    <>
                      <span className={`text-sm line-through font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        ৳{product.compare_price.toLocaleString()}
                      </span>
                      {discountPct > 0 && (
                        <span className="text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">
                          {discountPct}% OFF
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Checked confirmation bar */}
            {isChecked && (
              <div
                className="mt-4 py-2 px-4 rounded-lg text-center text-sm font-semibold"
                style={{
                  backgroundColor: `${accent}15`,
                  color: accent,
                  border: `1px solid ${accent}30`,
                }}
              >
                ✅ অর্ডারে যুক্ত হয়েছে
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
