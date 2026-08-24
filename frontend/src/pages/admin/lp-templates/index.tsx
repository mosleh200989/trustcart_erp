// Storefronts → Templates: reusable LP Maker layouts.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaLayerGroup, FaTrash, FaMagic } from 'react-icons/fa';
import { Block } from '@/components/lp-maker/blocks';
import BlockRenderer from '@/components/lp-maker/BlockRenderer';

interface LpTemplate {
  id: number;
  name: string;
  description: string | null;
  blocks: Block[];
  created_at: string;
}

export default function LpTemplatesIndex() {
  const router = useRouter();
  const [templates, setTemplates] = useState<LpTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/lp-templates');
      setTemplates(res.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const useTemplate = (id: number) => router.push(`/admin/lp-maker/create?template=${id}`);

  const rename = async (template: LpTemplate) => {
    const name = window.prompt('Template name:', template.name);
    if (!name?.trim() || name.trim() === template.name) return;
    try { await apiClient.put(`/lp-templates/${template.id}`, { name: name.trim() }); fetchData(); }
    catch (err) { console.error(err); }
  };

  const remove = async (id: number) => {
    try { await apiClient.delete(`/lp-templates/${id}`); setDeleteConfirm(null); fetchData(); }
    catch (err) { console.error(err); }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <FaLayerGroup className="text-brand" /> Templates
        </h1>
        <p className="text-sm text-gray-500 mb-6 max-w-3xl">
          Reusable LP Maker layouts. Build a page once, save it as a template from the editor
          (&ldquo;Save as template&rdquo;), then spawn the next campaign from it in a minute.
        </p>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading templates…</div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-card border border-gray-200 p-12 text-center text-gray-500">
            No templates yet. Open a page in LP Maker and use &ldquo;Save as template&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-card border border-gray-200 overflow-hidden flex flex-col">
                {/* Scaled live preview of the block tree */}
                <div className="h-52 overflow-hidden relative bg-gray-50 border-b border-gray-100">
                  <div
                    className="absolute top-0 left-0 origin-top-left pointer-events-none select-none"
                    style={{ width: '400%', transform: 'scale(0.25)' }}
                    aria-hidden
                  >
                    {(template.blocks || []).slice(0, 6).map((block) => (
                      <BlockRenderer key={block.id} block={block} />
                    ))}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-gray-50 to-transparent" />
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <button onClick={() => rename(template)} className="font-semibold text-gray-900 text-left hover:text-brand" title="Click to rename">
                    {template.name}
                  </button>
                  {template.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {(template.blocks || []).length} blocks · {new Date(template.created_at).toLocaleDateString()}
                  </p>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => useTemplate(template.id)}
                      className="flex-1 bg-brand hover:bg-brand-dark text-white text-sm px-3 py-2 rounded-button flex items-center justify-center gap-2 font-medium"
                    >
                      <FaMagic size={12} /> Use template
                    </button>
                    {deleteConfirm === template.id ? (
                      <button onClick={() => remove(template.id)} className="px-3 py-2 bg-red-600 text-white rounded-button text-xs font-medium">
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(template.id)}
                        onBlur={() => setDeleteConfirm(null)}
                        className="p-2.5 text-gray-300 hover:text-red-600 border border-gray-200 rounded-button"
                        title="Delete template"
                      >
                        <FaTrash size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
