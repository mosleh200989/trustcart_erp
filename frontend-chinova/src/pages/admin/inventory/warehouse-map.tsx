import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { warehouseMap, warehouses } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaMap, FaWarehouse, FaMapMarkerAlt, FaBoxes } from 'react-icons/fa';

interface WarehouseOption {
  id: number;
  name: string;
}

export default function WarehouseMapPage() {
  const toast = useToast();
  const [warehouseList, setWarehouseList] = useState<WarehouseOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const list = await warehouses.list();
      setWarehouseList(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) loadMap(selectedId);
  }, [selectedId]);

  const loadMap = async (id: number) => {
    setLoading(true);
    try {
      const data = await warehouseMap.get(id);
      setMapData(data);
    } catch {
      toast.error('Failed to load warehouse map');
    } finally {
      setLoading(false);
    }
  };

  const occupancyColor = (loc: any) => {
    const qty = loc.stock?.total_quantity || 0;
    if (qty === 0) return 'bg-gray-100 border-gray-300 text-gray-500';
    if (qty < 50) return 'bg-yellow-50 border-yellow-300 text-yellow-800';
    if (qty < 200) return 'bg-blue-50 border-blue-300 text-blue-800';
    return 'bg-green-50 border-green-300 text-green-800';
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaMap className="text-blue-600" />
            Warehouse Visual Map
          </h1>
          <select
            value={selectedId || ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-64"
          >
            <option value="">Select warehouse...</option>
            {warehouseList.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : !mapData ? (
          <div className="text-center py-12 text-gray-500">Select a warehouse to view its layout</div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border p-4 text-center">
                <FaWarehouse className="mx-auto text-2xl text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">Warehouse</p>
                <p className="font-bold">{mapData.warehouse?.name}</p>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <p className="text-xs text-gray-500">Zones</p>
                <p className="text-2xl font-bold">{mapData.summary?.total_zones}</p>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <p className="text-xs text-gray-500">Locations</p>
                <p className="text-2xl font-bold">{mapData.summary?.total_locations}</p>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <p className="text-xs text-gray-500">Occupied</p>
                <p className="text-2xl font-bold text-green-600">{mapData.summary?.occupied_locations}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" /> Empty</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-yellow-50 border border-yellow-300" /> Low Stock</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-blue-50 border border-blue-300" /> Medium</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-green-50 border border-green-300" /> Well Stocked</div>
            </div>

            {/* Zones Grid */}
            <div className="space-y-6">
              {mapData.zones?.map((zone: any) => (
                <div key={zone.id} className="bg-white rounded-lg border overflow-hidden">
                  <div className="bg-gray-800 text-white p-3 flex items-center gap-2">
                    <FaMapMarkerAlt />
                    <span className="font-medium">{zone.name}</span>
                    <span className="text-gray-300 text-sm ml-2">({zone.locations?.length || 0} locations)</span>
                  </div>
                  <div className="p-4">
                    {zone.locations?.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {zone.locations.map((loc: any) => (
                          <div
                            key={loc.id}
                            className={`border-2 rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${occupancyColor(loc)}`}
                            title={`${loc.code} — ${loc.stock?.product_count || 0} products, ${loc.stock?.total_quantity || 0} qty`}
                          >
                            <div className="font-mono text-xs font-bold truncate">{loc.code}</div>
                            <div className="text-xs mt-1">
                              <FaBoxes className="inline mr-1" />
                              {loc.stock?.total_quantity || 0}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No locations in this zone</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
