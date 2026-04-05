import { useState, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { inventoryImport } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaFileImport, FaUpload, FaCheck, FaExclamationTriangle, FaDownload, FaTrash } from 'react-icons/fa';

type ImportType = 'products' | 'stock_levels' | 'suppliers';

const TEMPLATES: Record<ImportType, { headers: string[]; example: string[] }> = {
  products: {
    headers: ['name', 'sku', 'description', 'price', 'category_id'],
    example: ['Organic Almonds', 'ALM-001', 'Premium organic almonds', '12.99', '1'],
  },
  stock_levels: {
    headers: ['sku', 'warehouse_id', 'quantity'],
    example: ['ALM-001', '1', '500'],
  },
  suppliers: {
    headers: ['company_name', 'contact_person', 'email', 'phone', 'address'],
    example: ['Acme Organics', 'John Doe', 'john@acme.com', '555-0100', '123 Farm Lane'],
  },
};

function parseCsvText(text: string): any[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

export default function BulkImportPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<ImportType>('products');
  const [rows, setRows] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsvText(text);
      if (parsed.length === 0) {
        toast.error('No data rows found in CSV');
        return;
      }
      setRows(parsed);
      setStep('preview');
      setValidationResult(null);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    try {
      const result = await inventoryImport.validate(importType, rows);
      setValidationResult(result);
      if (result.valid) {
        toast.success('Validation passed! Ready to import.');
      } else {
        toast.error(`Found ${result.errors.length} validation error(s)`);
      }
    } catch (err: any) {
      toast.error('Validation failed');
    }
  };

  const handleExecute = async () => {
    setImporting(true);
    try {
      const result = await inventoryImport.execute(importType, rows);
      setImportResult(result);
      setStep('result');
      toast.success(`Imported ${result.imported} record(s)`);
    } catch (err: any) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const t = TEMPLATES[importType];
    const csv = [t.headers.join(','), t.example.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setRows([]);
    setValidationResult(null);
    setImportResult(null);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <FaFileImport className="text-blue-600" />
          Bulk Import
        </h1>

        {/* Import Type Selection */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Import Type</label>
          <div className="flex flex-wrap gap-3">
            {(['products', 'stock_levels', 'suppliers'] as ImportType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setImportType(type); reset(); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  importType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <button onClick={downloadTemplate} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
              <FaDownload /> Download Template CSV
            </button>
          </div>
        </div>

        {step === 'upload' && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <FaUpload className="mx-auto text-4xl text-gray-300 mb-4" />
            <p className="text-gray-600 mb-4">Upload a CSV file to import {importType.replace('_', ' ')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Choose CSV File
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Expected columns: {TEMPLATES[importType].headers.join(', ')}
            </p>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Preview ({rows.length} rows)</h2>
                <div className="flex gap-2">
                  <button onClick={reset} className="inline-flex items-center gap-1 px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
                    <FaTrash /> Clear
                  </button>
                  <button onClick={handleValidate} className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">
                    <FaExclamationTriangle /> Validate
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={importing || (validationResult && !validationResult.valid)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    <FaCheck /> {importing ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </div>

              {/* Validation Errors */}
              {validationResult && !validationResult.valid && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-red-700 font-medium mb-2">Validation Errors:</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {validationResult.errors.slice(0, 10).map((e: any, i: number) => (
                      <li key={i}>Row {e.row}: {e.field ? `[${e.field}] ` : ''}{e.message}</li>
                    ))}
                    {validationResult.errors.length > 10 && (
                      <li>...and {validationResult.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}
              {validationResult?.valid && (
                <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-green-700 text-sm">
                  All {rows.length} rows passed validation.
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-xs">#</th>
                      {rows.length > 0 && Object.keys(rows[0]).map((key) => (
                        <th key={key} className="text-left p-2 text-xs">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.slice(0, 100).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2 text-xs text-gray-400">{i + 1}</td>
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="p-2 text-xs">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 100 && (
                  <p className="text-xs text-gray-400 p-2 text-center">Showing first 100 of {rows.length} rows</p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="bg-white rounded-lg border p-6 text-center">
            <FaCheck className="mx-auto text-4xl text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Import Complete</h2>
            <p className="text-gray-600 mb-4">{importResult.imported} records imported successfully.</p>
            {importResult.errors?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-left max-w-lg mx-auto">
                <p className="text-red-700 font-medium mb-2">{importResult.errors.length} error(s):</p>
                <ul className="text-sm text-red-600 space-y-1">
                  {importResult.errors.slice(0, 10).map((e: any, i: number) => (
                    <li key={i}>Row {e.row}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={reset} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Import More
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
