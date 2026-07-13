import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaFileExcel, FaGripVertical, FaSave, FaSyncAlt, FaUserClock } from 'react-icons/fa';

type CalendarRow = {
  userId: number;
  name: string;
  email?: string | null;
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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

  const legend = useMemo(() => {
    const config = data?.keyConfig || {};
    return Object.values(config).filter((item: any) => item?.key);
  }, [data?.keyConfig]);

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
    if (!data || rows.length === 0) {
      setMessage('No calendar data is available to export.');
      return;
    }
    const blob = createCalendarWorkbook(data, rows);
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
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <Link href="/admin/presence" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
              <FaArrowLeft />
              Check In/Out Dashboard
            </Link>
            <div className="flex items-center gap-3 text-sm text-blue-700 font-semibold mt-4">
              <FaUserClock />
              Check In/Out Module
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Check In/Out Calendar</h1>
            <p className="text-gray-600 mt-1">Sheet-style attendance calendar for all active users.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
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
              disabled={!data || rows.length === 0}
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
          </div>
        </div>

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
              Timezone: {data?.timezone || '-'} | Users: {rows.length} | Gap every {data?.rowGap?.every || 0} rows
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

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-20 bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase min-w-[240px]">
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
                {rows.map((row) => (
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
                      <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-3">
                          {canManageCalendar && <FaGripVertical className="text-gray-400 cursor-grab" />}
                          <div>
                            <div className="font-semibold text-gray-900">{row.name}</div>
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
                    {row.insertGapAfter && (
                      <tr key={`${row.userId}-gap`}>
                        <td colSpan={(data?.days?.length || 0) + 1} style={{ height: data?.rowGap?.size || 12 }} className="bg-gray-100 border-b border-gray-200" />
                      </tr>
                    )}
                  </Fragment>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={(data?.days?.length || 0) + 1 || 2} className="px-4 py-10 text-center text-gray-500">
                      No calendar data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editingCell && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Edit Calendar Cell</h2>
                <p className="text-sm text-gray-500">{editingCell.name} | {editingCell.dateKey}</p>
              </div>
              <div className="p-4 space-y-4">
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
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
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
