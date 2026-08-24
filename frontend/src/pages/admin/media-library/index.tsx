// Storefronts → Media Library: browsable index of uploaded files.
import { useCallback, useEffect, useRef, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaPhotoVideo, FaSearch, FaTrash, FaCopy, FaCheck, FaCloudUploadAlt } from 'react-icons/fa';

interface MediaAsset {
  id: number;
  url: string;
  filename: string | null;
  mime: string | null;
  size_bytes: number | null;
  created_at: string;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function MediaLibrary() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(60);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(0); // files in flight
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (q: string, p: number) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/media?search=${encodeURIComponent(q)}&page=${p}`);
      setItems(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setPageSize(res.data?.page_size || 60);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData('', 1); }, [fetchData]);

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchData(value, 1), 300);
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await apiClient.post('/upload/image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) {
          await apiClient.post('/media/register', {
            url: res.data.url, filename: file.name, mime: file.type, size_bytes: file.size,
          });
        }
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    fetchData(search, 1);
    setPage(1);
  };

  const copyUrl = async (asset: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const remove = async (id: number) => {
    try {
      await apiClient.delete(`/media/${id}`);
      setDeleteConfirm(null);
      fetchData(search, page);
    } catch (err) { console.error(err); }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminLayout>
      <div
        className="p-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); }}
      >
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaPhotoVideo className="text-brand" /> Media Library
          </h1>
          <label className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button flex items-center gap-2 text-sm font-medium cursor-pointer">
            <FaCloudUploadAlt />
            {uploading > 0 ? `Uploading ${uploading}…` : 'Upload'}
            <input
              type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ''; }}
            />
          </label>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Shared images for landing pages and storefronts. Drag files anywhere on this page to upload.
          Editor uploads land here automatically.
        </p>

        <div className="flex items-center border border-gray-200 rounded-card bg-white px-3 max-w-md mb-6">
          <FaSearch className="text-gray-300" size={13} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by filename…"
            className="flex-1 px-3 py-2.5 text-sm outline-none"
          />
          <span className="text-xs text-gray-400">{total} files</span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading media…</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-card border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
            {search ? `Nothing matches “${search}”.` : 'The library is empty. Upload images or drag them here.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {items.map((asset) => (
                <div key={asset.id} className="group bg-white border border-gray-200 rounded-card overflow-hidden">
                  <div className="aspect-square bg-gray-50 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => copyUrl(asset)}
                        className="bg-white text-gray-800 rounded-lg p-2 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-100"
                        title="Copy URL"
                      >
                        {copiedId === asset.id ? <><FaCheck className="text-green-600" size={11} /> Copied</> : <><FaCopy size={11} /> URL</>}
                      </button>
                      {deleteConfirm === asset.id ? (
                        <button onClick={() => remove(asset.id)} className="bg-red-600 text-white rounded-lg p-2 text-xs font-medium">
                          Confirm
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(asset.id)}
                          className="bg-white text-gray-500 hover:text-red-600 rounded-lg p-2"
                          title="Remove from library"
                        >
                          <FaTrash size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="text-[11px] text-gray-700 truncate" title={asset.filename || ''}>{asset.filename || '—'}</div>
                    <div className="text-[10px] text-gray-400">
                      {formatSize(asset.size_bytes)}{asset.size_bytes ? ' · ' : ''}{new Date(asset.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); fetchData(search, p); }}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-button disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-500">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => { const p = page + 1; setPage(p); fetchData(search, p); }}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-button disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
