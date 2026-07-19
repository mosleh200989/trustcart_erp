import { Fragment, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { FaFileExcel, FaGripVertical, FaSave, FaSearch, FaSyncAlt, FaUserClock } from 'react-icons/fa';

type CalendarRow = {
  userId: number;
  name: string;
  email?: string | null;
  teamLeaderId?: number | null;
  teamLeaderName?: string | null;
  roleId?: number | null;
  roleName?: string | null;
  roleSlug?: string | null;
  rolePriority?: number | null;
  insertGapAfter?: boolean;
  cells: Array<{ dateKey: string; value: string; label: string; color: string; isManual?: boolean; note?: string }>;
};

type CalendarData = {
  sheetName: string;
  timezone: string;
  days: Array<{ day: number; key: string; label: string; weekday: string }>;
  keyConfig: Record<string, { key: string; label: string; color: string }>;
  rowGap: { every: number; size: number };
  rows: CalendarRow[];
};

type OverrideHistoryItem = {
  id: number;
  action: string;
  previousAttendanceKey?: string | null;
  previousAttendanceLabel?: string | null;
  previousNote?: string | null;
  newAttendanceKey?: string | null;
  newAttendanceLabel?: string | null;
  newNote?: string | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  createdAt?: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getCurrentMonthSheetName() {
  const now = new Date();
  return `${now.toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Dhaka' })}-${String(
    Number(now.toLocaleString('en-US', { year: 'numeric', timeZone: 'Asia/Dhaka' })),
  ).slice(-2)}`;
}

function xmlEscape(value: any) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index: number) {
  let name = '';
  let next = index + 1;
  while (next > 0) {
    const mod = (next - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    next = Math.floor((next - mod) / 26);
  }
  return name;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function stringBytes(value: string) {
  return new TextEncoder().encode(value);
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function u16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function createZip(files: Array<{ path: string; content: string }>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  files.forEach((file) => {
    const name = stringBytes(file.path);
    const data = stringBytes(file.content);
    const crc = crc32(data);
    const localHeader = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
    ]);
    localParts.push(localHeader, data);

    const centralHeader = concatBytes([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const central = concatBytes(centralParts);
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);

  const zipBytes = concatBytes([...localParts, central, end]);
  const zipBuffer = zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength);
  return new Blob([zipBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function createCalendarWorkbook(data: CalendarData, rows: CalendarRow[]) {
  const matrix = [
    ['User', 'Email', ...data.days.map((day) => `${day.label} ${day.weekday}`)],
    ...rows.map((row) => [row.name, row.email || '', ...row.cells.map((cell) => cell.value || '')]),
  ];
  const sheetRows = matrix
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');
  const lastCol = columnName(Math.max(0, matrix[0].length - 1));
  const lastRow = Math.max(1, matrix.length);

  return createZip([
    {
      path: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
    },
    {
      path: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      path: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${xmlEscape(data.sheetName || 'Calendar')}" sheetId="1" r:id="rId1"/></sheets>` +
        '</workbook>',
    },
    {
      path: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
    },
    {
      path: 'xl/styles.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
        '</styleSheet>',
    },
    {
      path: 'xl/worksheets/sheet1.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<dimension ref="A1:${lastCol}${lastRow}"/>` +
        '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
        '<sheetFormatPr defaultRowHeight="15"/>' +
        `<sheetData>${sheetRows}</sheetData>` +
        '</worksheet>',
    },
  ]);
}

export default function PresenceCalendarPage() {
  const { hasPermission } = useAuth();
  const currentMonthSheetName = useMemo(() => getCurrentMonthSheetName(), []);
  const [data, setData] = useState<CalendarData | null>(null);
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [dragUserId, setDragUserId] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ userId: number; name: string; dateKey: string; value: string; note: string } | null>(null);
  const [overrideHistory, setOverrideHistory] = useState<OverrideHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [teamLeaderFilter, setTeamLeaderFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const canViewCalendar = hasPermission('view-presence') || hasPermission('view-presence-calendar') || hasPermission('manage-presence-calendar');
  const canManageCalendar = hasPermission('manage-presence-calendar') || hasPermission('manage-presence-settings');

  const load = async () => {
    if (!canViewCalendar) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await apiClient.get('/presence/calendar', { params: { sheetName: currentMonthSheetName } });
      setData(res.data);
      setRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to load check-in/out calendar.');
      setData(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewCalendar, currentMonthSheetName]);

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      if (!editingCell) {
        setOverrideHistory([]);
        return;
      }
      setHistoryLoading(true);
      try {
        const res = await apiClient.get('/presence/calendar/override-history', {
          params: { userId: editingCell.userId, dateKey: editingCell.dateKey },
        });
        if (!cancelled) setOverrideHistory(Array.isArray(res.data?.items) ? res.data.items : []);
      } catch {
        if (!cancelled) setOverrideHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [editingCell?.userId, editingCell?.dateKey]);

  const legend = useMemo(() => {
    const config = data?.keyConfig || {};
    return Object.values(config).filter((item: any) => item?.key);
  }, [data?.keyConfig]);

  const teamLeaderOptions = useMemo(() => {
    const options = new Map<string, string>();
    rows.forEach((row) => {
      const key = row.teamLeaderId ? String(row.teamLeaderId) : 'unassigned';
      const label = row.teamLeaderName || 'Unassigned Team Leader';
      options.set(key, label);
    });
    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => {
        if (a.value === 'unassigned') return 1;
        if (b.value === 'unassigned') return -1;
        return a.label.localeCompare(b.label);
      });
  }, [rows]);

  const roleOptions = useMemo(() => {
    const options = new Map<string, string>();
    rows.forEach((row) => {
      const key = row.roleId ? String(row.roleId) : row.roleSlug || 'unassigned';
      const label = row.roleName || 'Unassigned Role';
      options.set(key, label);
    });
    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => {
        if (a.value === 'unassigned') return 1;
        if (b.value === 'unassigned') return -1;
        return a.label.localeCompare(b.label);
      });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const teamKey = row.teamLeaderId ? String(row.teamLeaderId) : 'unassigned';
      const roleKey = row.roleId ? String(row.roleId) : row.roleSlug || 'unassigned';
      const matchesTeamLeader = teamLeaderFilter === 'all' || teamKey === teamLeaderFilter;
      const matchesRole = roleFilter === 'all' || roleKey === roleFilter;
      const searchable = [
        row.name,
        row.email,
        row.teamLeaderName,
        row.roleName,
        `user ${row.userId}`,
        String(row.userId),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesTeamLeader && matchesRole && (!query || searchable.includes(query));
    });
  }, [roleFilter, rows, teamLeaderFilter, userSearch]);

  const hasActiveFilters = Boolean(userSearch.trim()) || teamLeaderFilter !== 'all' || roleFilter !== 'all';

  const moveRow = (targetUserId: number) => {
    if (!canManageCalendar || dragUserId == null || dragUserId === targetUserId) return;
    setRows((prev) => {
      const next = prev.slice();
      const from = next.findIndex((row) => row.userId === dragUserId);
      const to = next.findIndex((row) => row.userId === targetUserId);
      if (from < 0 || to < 0) return prev;
      const [picked] = next.splice(from, 1);
      next.splice(to, 0, picked);
      return next;
    });
  };

  const saveOrder = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiClient.post('/presence/calendar/order', { userIds: rows.map((row) => row.userId) });
      setMessage('Calendar order saved successfully.');
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to save calendar order.');
    } finally {
      setSaving(false);
    }
  };

  const exportXlsx = () => {
    if (!data || filteredRows.length === 0) {
      setMessage('No calendar data is available to export.');
      return;
    }
    const blob = createCalendarWorkbook(data, filteredRows);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `check-in-out-calendar-${data.sheetName || currentMonthSheetName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const saveCellOverride = async () => {
    if (!editingCell) return;
    setSaving(true);
    setMessage('');
    try {
      await apiClient.post('/presence/calendar/override', {
        userId: editingCell.userId,
        dateKey: editingCell.dateKey,
        attendanceKey: editingCell.value,
        note: editingCell.note,
      });
      setEditingCell(null);
      setMessage(editingCell.value ? 'Calendar cell updated successfully.' : 'Calendar cell override cleared.');
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to update calendar cell.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          backHref="/admin/presence"
          backLabel="Presence"
          eyebrow="Presence Module"
          icon={<FaUserClock />}
          title="Presence Calendar"
          description="Sheet-style attendance calendar for all active users, grouped by role and team by default."
          actions={<>
            <button
              onClick={load}
              disabled={loading || !canViewCalendar}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportXlsx}
              disabled={!data || filteredRows.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              <FaFileExcel />
              Export XLSX
            </button>
            {canManageCalendar && (
              <button
                onClick={saveOrder}
                disabled={saving || rows.length === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60"
              >
                <FaSave />
                Save Order
              </button>
            )}
          </>}
        />

        {!canViewCalendar && (
          <div className="bg-white border border-red-100 text-red-700 rounded-lg px-4 py-3 text-sm shadow-sm">
            You do not have permission to view the check-in/out calendar.
          </div>
        )}

        {message && (
          <div className="bg-white border border-blue-100 text-blue-800 rounded-lg px-4 py-3 text-sm shadow-sm">
            {message}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">{data?.sheetName || currentMonthSheetName}</div>
            <div className="text-sm text-gray-500">
              Timezone: {data?.timezone || '-'} <span className="mx-1 text-gray-300">|</span> Users: {filteredRows.length}{hasActiveFilters ? ` of ${rows.length}` : ''} <span className="mx-1 text-gray-300">|</span> Gap every {data?.rowGap?.every || 0} rows
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {legend.map((item: any) => (
              <span key={`${item.key}-${item.label}`} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold text-gray-700">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.key} = {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
            <label className="block xl:col-span-2">
              <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">User Search</span>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by name, email, user ID..."
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Team Leader</span>
              <select
                value={teamLeaderFilter}
                onChange={(event) => setTeamLeaderFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Team Leaders</option>
                {teamLeaderOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Role</span>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Roles</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
              <span>Showing {filteredRows.length} of {rows.length} users.</span>
              <button
                type="button"
                onClick={() => {
                  setUserSearch('');
                  setTeamLeaderFilter('all');
                  setRoleFilter('all');
                }}
                className="font-semibold text-blue-700 hover:text-blue-900"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="border-t border-gray-100 px-4 py-2 text-xs font-medium text-gray-500 md:hidden">Swipe horizontally to view all calendar dates.</div>
          <div className="overflow-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-20 min-w-[168px] border-b border-r border-gray-200 bg-gray-50 px-2 py-3 text-left text-xs font-semibold uppercase text-gray-500 sm:min-w-[240px] sm:px-4">
                    User
                  </th>
                  {(data?.days || []).map((day) => (
                    <th key={day.key} className="border-b border-r border-gray-200 px-2 py-2 text-center min-w-[56px]">
                      <div className="text-xs font-bold text-gray-700">{day.label}</div>
                      <div className="text-[11px] text-gray-400">{day.weekday}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <Fragment key={row.userId}>
                    <tr
                      key={row.userId}
                      draggable={canManageCalendar}
                      onDragStart={() => setDragUserId(row.userId)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => moveRow(row.userId)}
                      onDragEnd={() => setDragUserId(null)}
                      className={dragUserId === row.userId ? 'opacity-50' : ''}
                    >
                      <td className="sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-2 py-3 sm:px-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {canManageCalendar && <FaGripVertical className="text-gray-400 cursor-grab" />}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-900">{row.name}</span>
                              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                                {row.roleName || 'No Role'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">{row.email || `User #${row.userId}`}</div>
                          </div>
                        </div>
                      </td>
                      {row.cells.map((cell) => (
                        <td key={`${row.userId}-${cell.dateKey}`} className="border-b border-r border-gray-200 px-1 py-1 text-center">
                          {cell.value ? (
                            <button
                              type="button"
                              title={cell.label}
                              onClick={() => canManageCalendar && setEditingCell({ userId: row.userId, name: row.name, dateKey: cell.dateKey, value: cell.value, note: cell.note || '' })}
                              className={`inline-flex items-center justify-center w-9 h-8 rounded text-xs font-black text-white ${canManageCalendar ? 'cursor-pointer ring-offset-1 hover:ring-2 hover:ring-gray-400' : ''} ${cell.isManual ? 'ring-2 ring-gray-900' : ''}`}
                              style={{ backgroundColor: cell.color }}
                            >
                              {cell.value}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => canManageCalendar && setEditingCell({ userId: row.userId, name: row.name, dateKey: cell.dateKey, value: '', note: '' })}
                              className={`inline-block w-9 h-8 rounded ${canManageCalendar ? 'hover:bg-gray-100' : ''}`}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                    {row.insertGapAfter && !hasActiveFilters && (
                      <tr key={`${row.userId}-gap`}>
                        <td colSpan={(data?.days?.length || 0) + 1} style={{ height: data?.rowGap?.size || 12 }} className="bg-gray-100 border-b border-gray-200" />
                      </tr>
                    )}
                  </Fragment>
                ))}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={(data?.days?.length || 0) + 1 || 2} className="px-4 py-10 text-center text-gray-500">
                      {hasActiveFilters ? 'No users match the current filters.' : 'No calendar data found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editingCell && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
            <div className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-lg border border-gray-200 bg-white shadow-xl sm:max-h-[90vh] sm:rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Edit Calendar Cell</h2>
                <p className="text-sm text-gray-500">{editingCell.name} | {editingCell.dateKey}</p>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto">
                <label className="block">
                  <span className="block text-sm font-semibold text-gray-700 mb-1">Attendance Key</span>
                  <select
                    value={editingCell.value}
                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="">Automatic</option>
                    {legend.map((item: any) => (
                      <option key={`${item.key}-${item.label}`} value={item.key}>
                        {item.key} - {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold text-gray-700 mb-1">Note</span>
                  <textarea
                    value={editingCell.note}
                    onChange={(e) => setEditingCell({ ...editingCell, note: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[90px]"
                  />
                </label>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Verdict Update History</h3>
                    {historyLoading && <span className="text-xs text-gray-500">Loading...</span>}
                  </div>
                  <div className="space-y-3">
                    {!historyLoading && overrideHistory.length === 0 && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                        No manual verdict changes have been recorded for this date.
                      </div>
                    )}
                    {overrideHistory.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-gray-900 capitalize">{item.action}</div>
                            <div className="text-xs text-gray-500">
                              By {item.updatedByName || item.updatedByEmail || 'Unknown user'} on {formatDateTime(item.createdAt)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.previousAttendanceKey || '-'} {'->'} {item.newAttendanceKey || 'Automatic'}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="rounded border border-gray-100 bg-gray-50 p-2">
                            <div className="font-semibold text-gray-600">Previous</div>
                            <div className="mt-1 text-gray-900">{item.previousAttendanceKey || '-'} {item.previousAttendanceLabel ? `- ${item.previousAttendanceLabel}` : ''}</div>
                            {item.previousNote && <div className="mt-1 text-gray-500 whitespace-pre-wrap">{item.previousNote}</div>}
                          </div>
                          <div className="rounded border border-gray-100 bg-green-50 p-2">
                            <div className="font-semibold text-gray-600">New</div>
                            <div className="mt-1 text-gray-900">{item.newAttendanceKey || 'Automatic'} {item.newAttendanceLabel ? `- ${item.newAttendanceLabel}` : ''}</div>
                            {item.newNote && <div className="mt-1 text-gray-500 whitespace-pre-wrap">{item.newNote}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-gray-200 p-4 sm:flex-row sm:justify-end sm:gap-3 [&>button]:min-h-11 [&>button]:w-full sm:[&>button]:w-auto">
                <button onClick={() => setEditingCell(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={saveCellOverride} disabled={saving} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-60">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
