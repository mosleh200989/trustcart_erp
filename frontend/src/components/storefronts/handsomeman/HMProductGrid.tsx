// Product listing view shared by "Shop All" and category pages.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import HMLayout, { Reveal, HM_COLORS } from './HMLayout';
import HMProductCard from './HMProductCard';
import { HMStorefront, HMProduct, fetchHMConfig, fetchHMProducts } from './hm';

export default function HMProductGrid({
  categorySlug,
}: {
  categorySlug?: string;
}) {
  const [config, setConfig] = useState<HMStorefront | null>(null);
  const [products, setProducts] = useState<HMProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'default' | 'price-asc' | 'price-desc'>('default');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [cfg, prods] = await Promise.all([
          fetchHMConfig(),
          fetchHMProducts({ category: categorySlug }),
        ]);
        if (cancelled) return;
        setConfig(cfg);
        setProducts(prods);
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [categorySlug]);

  const category = config?.categories.find((c) => c.slug === categorySlug);

  const visible = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (sort === 'price-asc') {
      list = [...list].sort((a, b) => (a.sale_price ?? a.base_price) - (b.sale_price ?? b.base_price));
    } else if (sort === 'price-desc') {
      list = [...list].sort((a, b) => (b.sale_price ?? b.base_price) - (a.sale_price ?? a.base_price));
    }
    return list;
  }, [products, search, sort]);

  const title = category ? category.name : 'Shop All';

  return (
    <HMLayout config={config} title={title}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-20">
        {/* Heading */}
        <Reveal>
          <p className="hm-display text-xs mb-2" style={{ color: HM_COLORS.gold, letterSpacing: '0.3em' }}>
            {category ? 'Category' : 'The full collection'}
          </p>
          <h1 className="hm-display text-3xl sm:text-5xl font-semibold mb-8">
            {title}
          </h1>
        </Reveal>

        {/* Category chips */}
        {config && config.categories.length > 0 && (
          <Reveal delay={80}>
            <div className="flex flex-wrap gap-2 mb-8">
              <Link
                href="/hm/products"
                className="hm-display text-xs px-4 py-2 rounded-sm transition-colors"
                style={
                  !categorySlug
                    ? { background: HM_COLORS.gold, color: '#0c0c0e' }
                    : { border: `1px solid ${HM_COLORS.line}`, color: HM_COLORS.textDim }
                }
              >
                All
              </Link>
              {config.categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/hm/category/${c.slug}`}
                  className="hm-display text-xs px-4 py-2 rounded-sm transition-colors"
                  style={
                    categorySlug === c.slug
                      ? { background: HM_COLORS.gold, color: '#0c0c0e' }
                      : { border: `1px solid ${HM_COLORS.line}`, color: HM_COLORS.textDim }
                  }
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </Reveal>
        )}

        {/* Search + sort */}
        <Reveal delay={120}>
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="flex-1 px-4 py-3 text-sm rounded-sm outline-none"
              style={{
                background: HM_COLORS.panel,
                border: `1px solid ${HM_COLORS.line}`,
                color: HM_COLORS.text,
              }}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="px-4 py-3 text-sm rounded-sm outline-none"
              style={{
                background: HM_COLORS.panel,
                border: `1px solid ${HM_COLORS.line}`,
                color: HM_COLORS.text,
              }}
            >
              <option value="default">Sort: Recommended</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </Reveal>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-24" style={{ color: HM_COLORS.textDim }}>Loading products…</div>
        ) : visible.length === 0 ? (
          <div
            className="text-center py-24 rounded-sm"
            style={{ background: HM_COLORS.panel, border: `1px solid ${HM_COLORS.line}`, color: HM_COLORS.textDim }}
          >
            No products found{search ? ` for “${search}”` : ' in this category yet'}.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {visible.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 70}>
                <HMProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </HMLayout>
  );
}
