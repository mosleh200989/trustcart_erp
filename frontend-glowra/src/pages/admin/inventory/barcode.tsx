import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { inventoryBarcode } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaBarcode, FaSearch, FaPrint, FaTag } from 'react-icons/fa';

export default function BarcodeToolsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'generate' | 'lookup' | 'labels'>('generate');

  // Generate state
  const [barcodeText, setBarcodeText] = useState('');
  const [barcodeType, setBarcodeType] = useState('code128');
  const [barcodeUrl, setBarcodeUrl] = useState('');

  // Lookup state
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Label state
  const [labelType, setLabelType] = useState<'batch' | 'location' | 'po'>('batch');
  const [labelId, setLabelId] = useState('');
  const [labelData, setLabelData] = useState<any>(null);

  const handleGenerate = async () => {
    if (!barcodeText.trim()) {
      toast.error('Enter text to encode');
      return;
    }
    try {
      const url = await inventoryBarcode.generateBlobUrl(barcodeText, barcodeType);
      setBarcodeUrl(url);
    } catch {
      toast.error('Failed to generate barcode');
    }
  };

  const handleLookup = async () => {
    if (!lookupCode.trim()) return;
    setLookupLoading(true);
    try {
      const result = await inventoryBarcode.lookup(lookupCode);
      setLookupResult(result);
      if (!result.found) {
        toast.error('No match found for this code');
      }
    } catch {
      toast.error('Lookup failed');
    } finally {
      setLookupLoading(false);
    }
  };

  // Label barcode URL (fetched with auth)
  const [labelBarcodeUrl, setLabelBarcodeUrl] = useState('');

  const handleFetchLabel = async () => {
    const id = parseInt(labelId);
    if (isNaN(id)) { toast.error('Enter a valid ID'); return; }
    try {
      let data;
      if (labelType === 'batch') data = await inventoryBarcode.getBatchLabel(id);
      else if (labelType === 'location') data = await inventoryBarcode.getLocationLabel(id);
      else data = await inventoryBarcode.getPoLabel(id);
      setLabelData(data);
      if (data?.barcode_text) {
        const url = await inventoryBarcode.generateBlobUrl(data.barcode_text);
        setLabelBarcodeUrl(url);
      }
    } catch {
      toast.error('Failed to load label data');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <FaBarcode className="text-blue-600" />
          Barcode Tools
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {[
            { key: 'generate', label: 'Generate', icon: FaBarcode },
            { key: 'lookup', label: 'Lookup', icon: FaSearch },
            { key: 'labels', label: 'Print Labels', icon: FaTag },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 ${
                tab === t.key ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="text-sm" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'generate' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Generate Barcode</h2>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                placeholder="Enter text or code..."
                value={barcodeText}
                onChange={(e) => setBarcodeText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={barcodeType}
                onChange={(e) => setBarcodeType(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full sm:w-40"
              >
                <option value="code128">Code 128</option>
                <option value="ean13">EAN-13</option>
                <option value="qrcode">QR Code</option>
              </select>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Generate
              </button>
            </div>
            {barcodeUrl && (
              <div className="text-center">
                <img src={barcodeUrl} alt="Generated barcode" className="mx-auto max-w-sm border p-4 rounded" />
                <div className="mt-3 flex justify-center gap-3">
                  <a href={barcodeUrl} download="barcode.png" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
                    Download
                  </a>
                  <button onClick={handlePrint} className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm">
                    <FaPrint /> Print
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'lookup' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Barcode Lookup</h2>
            <p className="text-sm text-gray-500 mb-4">Scan or enter a barcode to find the associated product, batch, location, or PO.</p>
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Scan or type barcode..."
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                autoFocus
              />
              <button
                onClick={handleLookup}
                disabled={lookupLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                {lookupLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {lookupResult && (
              lookupResult.found ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium mb-2">
                    Found: <span className="capitalize">{lookupResult.type?.replace('_', ' ')}</span>
                  </p>
                  <div className="text-sm text-green-700">
                    {Object.entries(lookupResult.data || {}).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="font-medium">{k}:</span>
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                  No match found for &ldquo;{lookupCode}&rdquo;
                </div>
              )
            )}
          </div>
        )}

        {tab === 'labels' && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Print Labels</h2>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <select
                value={labelType}
                onChange={(e) => { setLabelType(e.target.value as any); setLabelData(null); }}
                className="border rounded-lg px-3 py-2 text-sm w-full sm:w-48"
              >
                <option value="batch">Stock Batch</option>
                <option value="location">Warehouse Location</option>
                <option value="po">Purchase Order</option>
              </select>
              <input
                type="number"
                placeholder={`Enter ${labelType} ID...`}
                value={labelId}
                onChange={(e) => setLabelId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchLabel()}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={handleFetchLabel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Load Label
              </button>
            </div>

            {labelData && (
              <div className="border-2 border-dashed rounded-lg p-6 max-w-md mx-auto print:border-solid" id="printable-label">
                <div className="text-center mb-3">
                  <img
                    src={labelBarcodeUrl}
                    alt="Barcode"
                    className="mx-auto max-w-full"
                  />
                </div>
                <div className="space-y-1 text-sm">
                  {Object.entries(labelData.label_fields || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="font-medium capitalize">{k.replace(/_/g, ' ')}:</span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center print:hidden">
                  <button onClick={handlePrint} className="inline-flex items-center gap-1 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 text-sm">
                    <FaPrint /> Print Label
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
