import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

export default function TelephonyCallDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(false);
  const [call, setCall] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await apiClient.get(`/telephony/calls/${id}`);
        setCall(res.data);
      } catch (err) {
        console.error('Failed to load call', err);
        setCall(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const formatDateTime = (value: any) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Call Detail</h1>
            <p className="text-gray-600 mt-1">PBX call record and recording</p>
          </div>
          <Link href="/admin/telephony/calls" className="text-sm text-blue-600 hover:text-blue-800">
            ← Back to Call Logs
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">Loading…</div>
        )}

        {!loading && !call && (
          <div className="bg-white rounded-lg shadow p-6 text-gray-600">Call not found</div>
        )}

        {!loading && call && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-gray-900">#{call.id}</div>
                <div className="text-sm text-gray-700">Status: <span className="font-semibold">{call.status}</span></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Direction</div>
                  <div className="text-gray-900 font-medium">{call.direction || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Provider</div>
                  <div className="text-gray-900 font-medium">{call.provider || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Customer Phone</div>
                  <div className="text-gray-900 font-medium">{call.customerPhone || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Agent Phone</div>
                  <div className="text-gray-900 font-medium">{call.agentPhone || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Started</div>
                  <div className="text-gray-900 font-medium">{formatDateTime(call.startedAt)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Answered</div>
                  <div className="text-gray-900 font-medium">{formatDateTime(call.answeredAt)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Ended</div>
                  <div className="text-gray-900 font-medium">{formatDateTime(call.endedAt)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Duration (sec)</div>
                  <div className="text-gray-900 font-medium">{call.durationSeconds ?? '—'}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-semibold text-gray-900 mb-2">Recording</div>
                {call.recordingUrl ? (
                  <div className="space-y-2">
                    <audio controls className="w-full" src={call.recordingUrl} />
                    <a className="text-sm text-blue-600 hover:text-blue-800" href={call.recordingUrl} target="_blank" rel="noreferrer">
                      Open recording
                    </a>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No recording URL available yet</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-semibold text-gray-900 mb-2">Raw Meta</div>
              <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-[540px]">
                {JSON.stringify(call.meta || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
