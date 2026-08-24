// Storefronts → Performance: orders & revenue per storefront and landing
// page. Orders/revenue are time-windowed from real sales; page view counts
// are lifetime numbers, so conversion rates are only shown for "all time".
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaChartLine, FaStore, FaRocket } from 'react-icons/fa';

interface SfPerf {
  id: number; name: string; slug: string; domain: string | null;
  is_active: boolean; orders: number; revenue: number;
}
interface LpPerf { slug: string; orders: number; revenue: number }
interface LpMeta { id: number; title: string; slug: string; template?: string; view_count: number; order_count: number; is_active: boolean }

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 0, label: 'All time' },
];

const taka = (n: number) => `৳${Number(n || 0).toLocaleString('en-US')}`;

export default function StorefrontPerformance() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<{ storefronts: SfPerf[]; landing_pages: LpPerf[] } | null>(null);
  const [pages, setPages] = useState<LpMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [perfRes, lpRes] = await Promise.all([
          apiClient.get(`/storefronts/performance/summary${days ? `?days=${days}` : ''}`),
          apiClient.get('/landing-pages'),
        ]);
        if (cancelled) return;
        setSummary(perfRes.data);
        setPages(lpRes.data || []);
      } catch (err) {
        console.error('Failed to load performance:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [days]);

  const isAllTime = days === 0;

  const pageRows = useMemo(() => {
    if (!summary) return [];
    const salesBySlug = new Map(summary.landing_pages.map((r) => [r.slug, r]));
    return pages
      .map((page) => {
        const sales = salesBySlug.get(page.slug);
        const orders = isAllTime ? page.order_count : Number(sales?.orders || 0);
        return {
          ...page,
          orders,
          revenue: Number(sales?.revenue || 0),
          cvr: isAllTime && page.view_count > 0 ? page.order_count / page.view_count : null,
        };
      })
      .sort((x, y) => y.orders - x.orders);
  }, [summary, pages, isAllTime]);

  const totals = useMemo(() => {
    const sfOrders = summary?.storefronts.reduce((sum, s) => sum + s.orders, 0) || 0;
    const sfRevenue = summary?.storefronts.reduce((sum, s) => sum + s.revenue, 0) || 0;
    const lpOrders = pageRows.reduce((sum, p) => sum + p.orders, 0);
    const lpRevenue = pageRows.reduce((sum, p) => sum + p.revenue, 0);
    return { orders: sfOrders + lpOrders, revenue: sfRevenue + lpRevenue };
  }, [summary, pageRows]);

  const maxPageOrders = Math.max(1, ...pageRows.map((p) => p.orders));

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaChartLine className="text-brand" /> Performance
          </h1>
          <div className="flex items-center border border-gray-200 rounded-button overflow-hidden bg-white">
            {RANGES.map((range) => (
              <button
                key={range.days}
                onClick={() => setDays(range.days)}
                className={`px-3.5 py-2 text-sm font-medium ${days === range.days ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Orders and revenue from delivered-track sales (cancelled excluded).
          Views are lifetime counters, so conversion rates appear only on &ldquo;All time&rdquo;.
        </p>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading performance…</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                ['Total orders', String(totals.orders)],
                ['Total revenue', taka(totals.revenue)],
                ['Storefronts', String(summary?.storefronts.length || 0)],
                ['Active pages', String(pages.filter((p) => p.is_active).length)],
              ].map(([label, value]) => (
                <div key={label} className="bg-white rounded-card border border-gray-200 p-4">
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-400 uppercase mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Storefronts */}
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FaStore className="text-gray-400" /> Storefronts
            </h2>
            <div className="bg-white rounded-card border border-gray-200 overflow-x-auto mb-8">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Storefront</th>
                    <th className="text-right px-4 py-3">Orders</th>
                    <th className="text-right px-4 py-3">Revenue</th>
                    <th className="text-right px-4 py-3">Avg order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(summary?.storefronts || []).map((s) => (
                    <tr key={s.id} className={s.is_active ? '' : 'opacity-50'}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/storefronts/${s.id}`} className="font-medium text-gray-900 hover:text-brand">{s.name}</Link>
                        <span className="text-xs text-gray-400 ml-2">{s.domain || `/${s.slug}`}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{s.orders}</td>
                      <td className="px-4 py-3 text-right font-medium">{taka(s.revenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{s.orders > 0 ? taka(s.revenue / s.orders) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Landing pages */}
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FaRocket className="text-gray-400" /> Landing pages
            </h2>
            <div className="bg-white rounded-card border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Page</th>
                    <th className="text-right px-4 py-3">Views (lifetime)</th>
                    <th className="text-right px-4 py-3">Orders</th>
                    <th className="text-right px-4 py-3">Revenue</th>
                    <th className="text-right px-4 py-3">{isAllTime ? 'CVR' : ''}</th>
                    <th className="text-left px-4 py-3 w-40"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.map((page) => (
                    <tr key={page.id} className={page.is_active ? '' : 'opacity-50'}>
                      <td className="px-4 py-3">
                        <Link
                          href={page.template === 'builder' ? `/admin/lp-maker/${page.id}` : `/admin/landing-pages/${page.id}`}
                          className="font-medium text-gray-900 hover:text-brand"
                        >
                          {page.title}
                        </Link>
                        <span className="text-xs text-gray-400 font-mono ml-2">/{page.slug}</span>
                        {page.template === 'builder' && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-badge bg-purple-100 text-purple-700 font-medium">LP Maker</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{page.view_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium">{page.orders}</td>
                      <td className="px-4 py-3 text-right font-medium">{page.revenue ? taka(page.revenue) : '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {isAllTime && page.cvr != null ? `${(page.cvr * 100).toFixed(2)}%` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full"
                            style={{ width: `${(page.orders / maxPageOrders) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
