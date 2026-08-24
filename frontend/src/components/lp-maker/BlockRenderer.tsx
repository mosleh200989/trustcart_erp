// Renders a single LP Maker block. Used by BOTH the editor canvas and the
// public page, so the editor preview is exactly what visitors see.
// The interactive order form is live-rendered by BuilderTemplate; here the
// 'order-form' type renders its static shell (edit mode / SSR placeholder).
import { useEffect, useState } from 'react';
import { Block, BuilderProduct, extractYouTubeId } from './blocks';

const HEADING_SIZES: Record<string, string> = {
  sm: 'text-xl',
  md: 'text-2xl sm:text-3xl',
  lg: 'text-3xl sm:text-4xl',
  xl: 'text-4xl sm:text-5xl',
};

const TEXT_SIZES: Record<string, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const BUTTON_SIZES: Record<string, string> = {
  sm: 'px-5 py-2.5 text-sm',
  md: 'px-8 py-3.5 text-base',
  lg: 'px-10 py-4 text-lg',
};

const HERO_HEIGHTS: Record<string, string> = {
  small: 'min-h-[260px]',
  medium: 'min-h-[380px]',
  large: 'min-h-[540px]',
};

export const taka = (n: number) => `৳${Number(n || 0).toLocaleString('en-US')}`;

function alignToFlex(align: string) {
  return align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
}

export function Countdown({ endsAt, color }: { endsAt: string; color: string }) {
  const [left, setLeft] = useState<number>(() =>
    endsAt ? new Date(endsAt).getTime() - Date.now() : 0,
  );

  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setLeft(new Date(endsAt).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  if (!endsAt) {
    return <span style={{ color, opacity: 0.7 }}>সময় নির্ধারণ করুন</span>;
  }
  if (left <= 0) {
    return <span style={{ color }}>অফার শেষ!</span>;
  }

  const s = Math.floor(left / 1000);
  const parts = [
    { v: Math.floor(s / 86400), l: 'দিন' },
    { v: Math.floor((s % 86400) / 3600), l: 'ঘণ্টা' },
    { v: Math.floor((s % 3600) / 60), l: 'মিনিট' },
    { v: s % 60, l: 'সেকেন্ড' },
  ];

  return (
    <div className="flex gap-3 justify-center">
      {parts.map((p) => (
        <div key={p.l} className="text-center">
          <div className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color }}>
            {String(p.v).padStart(2, '0')}
          </div>
          <div className="text-xs" style={{ color, opacity: 0.8 }}>{p.l}</div>
        </div>
      ))}
    </div>
  );
}

export default function BlockRenderer({
  block,
  onCta,
}: {
  block: Block;
  /** Called when a CTA wants to scroll to the order form (live mode). */
  onCta?: () => void;
}) {
  const p = block.props;

  switch (block.type) {
    case 'hero': {
      const overlay = Math.min(90, Math.max(0, Number(p.overlay_opacity ?? 45))) / 100;
      return (
        <section
          className={`relative flex items-center justify-center px-6 py-14 ${HERO_HEIGHTS[p.height] || HERO_HEIGHTS.medium}`}
          style={{
            backgroundColor: p.background_color,
            backgroundImage: p.background_image ? `url(${p.background_image})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            textAlign: p.align as any,
          }}
        >
          {p.background_image && (
            <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
          )}
          <div className="relative max-w-3xl w-full" style={{ color: p.text_color }}>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4">{p.title}</h1>
            {p.subtitle && <p className="text-base sm:text-xl opacity-90 mb-7 whitespace-pre-line">{p.subtitle}</p>}
            {p.button_text && (
              <button
                type="button"
                onClick={onCta}
                className="font-bold px-9 py-4 rounded-xl text-lg shadow-lg transition-transform hover:scale-105"
                style={{ background: p.button_bg, color: p.button_color }}
              >
                {p.button_text}
              </button>
            )}
          </div>
        </section>
      );
    }

    case 'heading':
      return (
        <h2
          className={`${HEADING_SIZES[p.size] || HEADING_SIZES.lg} font-bold px-6 py-4`}
          style={{ color: p.color, textAlign: p.align as any }}
        >
          {p.text}
        </h2>
      );

    case 'text':
      return (
        <p
          className={`${TEXT_SIZES[p.size] || TEXT_SIZES.md} px-6 py-3 leading-relaxed whitespace-pre-line max-w-3xl mx-auto`}
          style={{ color: p.color, textAlign: p.align as any }}
        >
          {p.text}
        </p>
      );

    case 'image':
      return (
        <div className="px-6 py-3 flex" style={{ justifyContent: alignToFlex(p.align) }}>
          {p.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.url}
              alt={p.alt || ''}
              style={{ width: `${p.width || 100}%`, borderRadius: p.radius }}
              className="max-w-full h-auto"
            />
          ) : (
            <div className="w-full h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-sm">
              🖼️ ছবি যুক্ত করুন
            </div>
          )}
        </div>
      );

    case 'gallery': {
      const images: string[] = p.images || [];
      return (
        <div className="px-6 py-3">
          {images.length === 0 ? (
            <div className="h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-sm">
              🎞️ গ্যালারির ছবি যুক্ত করুন
            </div>
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, p.columns || 3))}, 1fr)` }}
            >
              {images.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="w-full h-full object-cover aspect-square" style={{ borderRadius: p.radius }} />
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'video': {
      const id = extractYouTubeId(p.url);
      return (
        <div className="px-6 py-3 max-w-3xl mx-auto">
          {id ? (
            <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%', borderRadius: p.radius }}>
              <iframe
                src={`https://www.youtube.com/embed/${id}`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="video"
              />
            </div>
          ) : (
            <div className="h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-sm">
              ▶️ ইউটিউব লিংক দিন
            </div>
          )}
        </div>
      );
    }

    case 'button':
      return (
        <div className="px-6 py-3 flex" style={{ justifyContent: alignToFlex(p.align) }}>
          <button
            type="button"
            onClick={() => {
              if (p.action === 'url' && p.url) window.open(p.url, '_blank');
              else onCta?.();
            }}
            className={`font-bold shadow transition-transform hover:scale-105 ${BUTTON_SIZES[p.size] || BUTTON_SIZES.md} ${p.full_width ? 'w-full' : ''}`}
            style={{ background: p.bg, color: p.color, borderRadius: p.radius }}
          >
            {p.text}
          </button>
        </div>
      );

    case 'benefits': {
      const items: { icon: string; text: string }[] = p.items || [];
      return (
        <div className="px-6 py-3 max-w-3xl mx-auto">
          <div
            className="grid gap-3 p-5"
            style={{
              gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, p.columns || 1))}, 1fr)`,
              background: p.background,
              borderRadius: p.radius,
            }}
          >
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{item.icon}</span>
                <span className="font-medium" style={{ color: p.color }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'testimonials': {
      const items: Array<{ name: string; location?: string; rating: number; text: string; image_url?: string }> =
        p.items || [];
      return (
        <section className="px-6 py-8" style={{ background: p.background }}>
          {p.heading && (
            <h2 className="text-2xl font-bold text-center mb-6" style={{ color: p.text_color }}>{p.heading}</h2>
          )}
          {items.length === 0 ? (
            <div className="max-w-xl mx-auto h-24 bg-white/60 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-sm">
              ⭐ রিভিউ যুক্ত করুন — নিজে লিখুন অথবা লাইব্রেরি থেকে নিন
            </div>
          ) : (
            <div
              className="grid gap-4 max-w-4xl mx-auto"
              style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, p.columns || 2))}, 1fr)` }}
            >
              {items.map((review, i) => (
                <figure
                  key={i}
                  className="p-5 border border-gray-100 shadow-sm flex flex-col gap-3"
                  style={{ background: p.card_background, borderRadius: p.radius }}
                >
                  <div aria-label={`${review.rating} out of 5`} style={{ color: p.star_color }}>
                    {'★'.repeat(Math.min(5, Math.max(1, review.rating || 5)))}
                    <span className="opacity-25">{'★'.repeat(5 - Math.min(5, Math.max(1, review.rating || 5)))}</span>
                  </div>
                  <blockquote className="text-sm leading-relaxed flex-1" style={{ color: p.text_color }}>
                    “{review.text}”
                  </blockquote>
                  <figcaption className="flex items-center gap-3">
                    {review.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={review.image_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: p.star_color }}
                      >
                        {(review.name || '?').charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold" style={{ color: p.text_color }}>{review.name}</div>
                      {review.location && (
                        <div className="text-xs opacity-60" style={{ color: p.text_color }}>{review.location}</div>
                      )}
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      );
    }

    case 'countdown':
      return (
        <div className="px-6 py-3 max-w-xl mx-auto">
          <div className="p-5 text-center rounded-xl" style={{ background: p.background }}>
            {p.label && <p className="text-sm font-semibold mb-2" style={{ color: p.color, opacity: 0.85 }}>{p.label}</p>}
            <Countdown endsAt={p.ends_at} color={p.color} />
          </div>
        </div>
      );

    case 'divider':
      return (
        <div className="px-6 py-3 flex justify-center">
          <hr style={{ borderColor: p.color, borderTopWidth: p.thickness, width: `${p.width}%` }} />
        </div>
      );

    case 'spacer':
      return <div style={{ height: Math.max(4, Number(p.height) || 40) }} />;

    case 'html':
      return <div className="px-6 py-3" dangerouslySetInnerHTML={{ __html: p.html || '' }} />;

    case 'order-form': {
      // Static shell — the live page replaces this with the interactive form.
      const products: BuilderProduct[] = p.products || [];
      return (
        <section className="px-6 py-8" style={{ background: p.background }}>
          <div
            className="max-w-xl mx-auto p-6 border border-gray-200"
            style={{ background: p.card_background, borderRadius: p.radius }}
          >
            <h3 className="text-xl font-bold text-center mb-5" style={{ color: p.text_color }}>{p.heading}</h3>
            {products.length === 0 ? (
              <div className="h-20 bg-white/60 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-4">
                🛒 ইনভেন্টরি থেকে প্রোডাক্ট যুক্ত করুন
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {products.map((prod) => (
                  <div key={prod.id} className="flex items-center gap-3 bg-white/70 rounded-lg p-2 border border-gray-100">
                    {prod.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.image_url} alt="" className="w-11 h-11 rounded object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded bg-gray-100" />
                    )}
                    <span className="flex-1 text-sm font-medium" style={{ color: p.text_color }}>{prod.name}</span>
                    <span className="text-sm font-bold" style={{ color: p.accent }}>{taka(prod.price)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2.5">
              {['আপনার নাম', 'মোবাইল নম্বর', 'সম্পূর্ণ ঠিকানা'].map((ph) => (
                <div key={ph} className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm text-gray-400">{ph}</div>
              ))}
              <div className="text-center font-bold py-3.5 rounded-xl" style={{ background: p.button_bg, color: p.button_color }}>
                {p.button_text}
              </div>
            </div>
          </div>
        </section>
      );
    }

    default:
      return (
        <div className="px-6 py-4 text-sm text-red-500 bg-red-50">Unknown block: {block.type}</div>
      );
  }
}
