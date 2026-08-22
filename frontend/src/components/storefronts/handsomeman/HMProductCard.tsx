import Link from 'next/link';
import { HMProduct, hmPrice, taka } from './hm';
import { HM_COLORS } from './HMLayout';

export default function HMProductCard({ product }: { product: HMProduct }) {
  const { price, compare } = hmPrice(product);
  const out = product.stock_quantity != null && product.stock_quantity <= 0;
  const discount = compare ? Math.round(((compare - price) / compare) * 100) : 0;

  return (
    <Link
      href={`/hm/product/${product.slug}`}
      className="hm-card rounded-sm overflow-hidden flex flex-col group"
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 5', background: HM_COLORS.panelLight }}>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="hm-card-img w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center hm-display text-3xl" style={{ color: HM_COLORS.line }}>
            HM
          </div>
        )}
        {discount > 0 && (
          <span
            className="absolute top-3 left-3 hm-display text-[11px] px-2 py-1 rounded-sm"
            style={{ background: HM_COLORS.gold, color: '#0c0c0e' }}
          >
            −{discount}%
          </span>
        )}
        {out && (
          <span
            className="absolute inset-0 flex items-center justify-center hm-display text-sm tracking-widest"
            style={{ background: 'rgba(12,12,14,0.7)', color: HM_COLORS.textDim }}
          >
            Out of stock
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: HM_COLORS.text }}>
          {product.name}
        </h3>
        <div className="mt-auto pt-2 flex items-baseline gap-2">
          <span className="hm-gold font-bold">{taka(price)}</span>
          {compare && (
            <span className="text-xs line-through" style={{ color: HM_COLORS.textDim }}>
              {taka(compare)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
