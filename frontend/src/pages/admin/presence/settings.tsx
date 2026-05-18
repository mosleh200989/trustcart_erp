import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaSave, FaSyncAlt, FaUserClock } from 'react-icons/fa';

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

export default function PresenceSettingsPage() {
  const { hasPermission } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const canManageSettings = hasPermission('manage-presence-settings');
  const canSyncSheet = hasPermission('sync-presence-sheet');

  const load = async () => {
    if (!canManageSettings) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await apiClient.get('/presence/settings');
      setSettings(res.data);
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to load presence settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageSettings]);

  const saveSettings = async () => {
    setMessage('');
    setSaving(true);
    try {
      const res = await apiClient.post('/presence/settings', settings);
      setSettings(res.data);
      setMessage('Settings saved successfully.');
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const syncSheet = async () => {
    setMessage('');
    setSyncing(true);
    try {
      const res = await apiClient.post('/presence/sync/google-sheet');
      setMessage(`Google Sheet synced: ${res.data?.users || 0} users, ${res.data?.events || 0} events.`);
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || err?.response?.data?.error || 'Google Sheet sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <Link href="/admin/presence" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
              <FaArrowLeft />
              Presence Dashboard
            </Link>
            <div className="flex items-center gap-3 text-sm text-blue-700 font-semibold mt-4">
              <FaUserClock />
              Presence Module
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Presence Settings</h1>
            <p className="text-gray-600 mt-1">Office timing, attendance key, and Google Sheet sync configuration.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={load}
              disabled={loading || !canManageSettings}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {canSyncSheet && (
              <button
                onClick={syncSheet}
                disabled={syncing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
              >
                <FaSyncAlt className={syncing ? 'animate-spin' : ''} />
                Sync Sheet
              </button>
            )}
            <button
              onClick={saveSettings}
              disabled={saving || !settings || !canManageSettings}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60"
            >
              <FaSave />
              Save Settings
            </button>
          </div>
        </div>

        {!canManageSettings && (
          <div className="bg-white border border-red-100 text-red-700 rounded-lg px-4 py-3 text-sm shadow-sm">
            You do not have permission to manage presence settings.
          </div>
        )}

        {message && (
          <div className="bg-white border border-blue-100 text-blue-800 rounded-lg px-4 py-3 text-sm shadow-sm">
            {message}
          </div>
        )}

        {settings && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Configuration</h2>
              <p className="text-sm text-gray-500">These values control office timing and Google Sheet attendance sync.</p>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <Field label="Office Start Time">
                <input type="time" value={settings.officeStartTime || ''} onChange={(e) => setSettings({ ...settings, officeStartTime: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Office End Time">
                <input type="time" value={settings.officeEndTime || ''} onChange={(e) => setSettings({ ...settings, officeEndTime: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Timezone">
                <input value={settings.timezone || ''} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Attendance Key">
                <input value={settings.attendanceKey || ''} onChange={(e) => setSettings({ ...settings, attendanceKey: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <div className="md:col-span-2 xl:col-span-3 border-t border-gray-100 pt-4 mt-2">
                <h3 className="text-base font-bold text-gray-900">Attendance Key Meanings</h3>
                <p className="text-sm text-gray-500 mt-1">Scraped from the Google Sheet Attendance key tab. These values control what is written to the monthly attendance sheet.</p>
              </div>
              <Field label="Present Key">
                <input value={settings.attendancePresentKey || ''} onChange={(e) => setSettings({ ...settings, attendancePresentKey: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Present Meaning">
                <input value={settings.attendancePresentLabel || ''} onChange={(e) => setSettings({ ...settings, attendancePresentLabel: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Late Key">
                <input value={settings.attendanceLateKey || ''} onChange={(e) => setSettings({ ...settings, attendanceLateKey: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Late Meaning">
                <input value={settings.attendanceLateLabel || ''} onChange={(e) => setSettings({ ...settings, attendanceLateLabel: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Weekly Off Key">
                <input value={settings.attendanceWeeklyOffKey || ''} onChange={(e) => setSettings({ ...settings, attendanceWeeklyOffKey: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Weekly Off Meaning">
                <input value={settings.attendanceWeeklyOffLabel || ''} onChange={(e) => setSettings({ ...settings, attendanceWeeklyOffLabel: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Excused Absence Key">
                <input value={settings.attendanceExcusedAbsenceKey || ''} onChange={(e) => setSettings({ ...settings, attendanceExcusedAbsenceKey: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Excused Absence Meaning">
                <input value={settings.attendanceExcusedAbsenceLabel || ''} onChange={(e) => setSettings({ ...settings, attendanceExcusedAbsenceLabel: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Unexcused Absence Key">
                <input value={settings.attendanceUnexcusedAbsenceKey || ''} onChange={(e) => setSettings({ ...settings, attendanceUnexcusedAbsenceKey: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Unexcused Absence Meaning">
                <input value={settings.attendanceUnexcusedAbsenceLabel || ''} onChange={(e) => setSettings({ ...settings, attendanceUnexcusedAbsenceLabel: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Spreadsheet ID">
                <input value={settings.googleSpreadsheetId || ''} onChange={(e) => setSettings({ ...settings, googleSpreadsheetId: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Attendance Key Sheet Name">
                <input value={settings.settingsSheetName || ''} onChange={(e) => setSettings({ ...settings, settingsSheetName: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Attendance Sheet Name">
                <input value={settings.summarySheetName || ''} onChange={(e) => setSettings({ ...settings, summarySheetName: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <Field label="Events Sheet Name (optional)">
                <input value={settings.eventsSheetName || ''} onChange={(e) => setSettings({ ...settings, eventsSheetName: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </Field>
              <div className="md:col-span-2 xl:col-span-3 text-sm text-gray-600">
                Last sync: {formatDateTime(settings.lastSyncedAt)} {settings.lastSyncStatus ? `(${settings.lastSyncStatus})` : ''}
                {settings.lastSyncMessage ? ` - ${settings.lastSyncMessage}` : ''}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
