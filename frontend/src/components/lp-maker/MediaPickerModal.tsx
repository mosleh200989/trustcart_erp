// Pick an image from the shared media library (Storefronts → Media Library).
import { useEffect, useState } from 'react';
import apiClient from '@/services/api';
import { FaTimes, FaSearch } from 'react-icons/fa';

interface MediaAsset {
  id: number;
  url: string;
  filename: string | null;
  mime: string | null;
  created_at: string;
}

export default function MediaPickerModal({
  onSelect, onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/media?search=${encodeURIComponent(search)}`);
        setItems(res.data?.items || []);
      } catch (err) {
        console.error('Failed to load media library:', err);
      } finally {
        setLoading(false);
      }
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-card shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Media Library</h2>
          <div className="flex-1 flex items-center border border-gray-200 rounded-lg px-2.5 max-w-xs ml-auto">
            <FaSearch className="text-gray-300" size={12} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files…"
              className="flex-1 px-2 py-1.5 text-sm outline-none"
              autoFocus
            />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1"><FaTimes /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-14 text-gray-400 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-14 text-gray-400 text-sm">
              {search ? `Nothing matches “${search}”.` : 'The library is empty. Upload files in Storefronts → Media Library.'}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {items.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => { onSelect(asset.url); onClose(); }}
                  className="group border border-gray-200 rounded-lg overflow-hidden hover:border-brand hover:shadow-md transition-all text-left"
                  title={asset.filename || asset.url}
                >
                  <div className="aspect-square bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  </div>
                  <div className="px-1.5 py-1 text-[10px] text-gray-500 truncate">{asset.filename || '—'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
