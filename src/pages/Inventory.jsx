import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers'; // Σημαντικό για να φέρνουμε όλα τα δεδομένα
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import EntityFormDialog from '../components/shared/EntityFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

const warehouseColumns = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Warehouse' },
  { key: 'city', label: 'City' },
  { key: 'manager', label: 'Manager' },
  { key: 'status', label: 'Status', type: 'status' },
];

const movementColumns = [
  { key: 'product_name', label: 'Product' },
  { key: 'product_sku', label: 'SKU' },
  { key: 'warehouse_name', label: 'Warehouse' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'quantity', label: 'Qty', type: 'number' },
  { key: 'reference_type', label: 'Reference' },
  { key: 'created_date', label: 'Date', type: 'date' },
];

const warehouseFields = [
  { key: 'name', label: 'Warehouse Name', required: true },
  { key: 'code', label: 'Code', required: true, placeholder: 'e.g. WH-01' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'manager', label: 'Manager' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }
  ]},
];

export default function Inventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  // --- ΑΝΑΒΑΘΜΙΣΜΕΝΑ QUERIES (fetchList) ---
  const { data: warehouses = [] } = useQuery({ 
    queryKey: ['warehouses'], 
    queryFn: () => fetchList(base44.entities.Warehouse) 
  });
  
  const { data: movements = [] } = useQuery({ 
    queryKey: ['stockMovements'], 
    queryFn: () => fetchList(base44.entities.StockMovement, { sort: '-created_date' }) 
  });
  
  const { data: products = [] } = useQuery({ 
    queryKey: ['products'], 
    queryFn: () => fetchList(base44.entities.Product) 
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Warehouse.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Warehouse.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  });

  const handleSubmit = async (data) => {
    if (editing?.id) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync(data);
    setEditing(null);
    setDialogOpen(false);
  };

  // --- ΕΞΥΠΝΟΙ ΥΠΟΛΟΓΙΣΜΟΙ (Stats) ---
  const { totalIn, totalOut, lowStockAlerts } = useMemo(() => {
    return {
      totalIn: movements.filter(m => m.type === 'in').reduce((s, m) => s + (Number(m.quantity) || 0), 0),
      totalOut: movements.filter(m => m.type === 'out').reduce((s, m) => s + (Number(m.quantity) || 0), 0),
      lowStockAlerts: products.filter(p => Number(p.stock_quantity) <= Number(p.min_stock)).length
    };
  }, [movements, products]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader 
        title="Inventory Control" 
        subtitle="Διαχείριση αποθηκών και παρακολούθηση ροής αποθεμάτων" 
        actionLabel="Προσθήκη Αποθήκης" 
        onAction={() => { setEditing({}); setDialogOpen(true); }} 
      />

      {/* Stats Cards με χρωματική σήμανση */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatsCard 
          label="Ενεργές Αποθήκες" 
          value={warehouses.length} 
          icon={Warehouse} 
          description="Συνολικά σημεία αποθήκευσης"
        />
        <StatsCard 
          label="Συνολικές Εισαγωγές" 
          value={totalIn.toLocaleString('el-GR')} 
          icon={TrendingUp} 
          trend="up"
          change={`${movements.filter(m => m.type === 'in').length} κινήσεις`}
          className="border-l-4 border-l-green-500"
        />
        <StatsCard 
          label="Συνολικές Εξαγωγές" 
          value={totalOut.toLocaleString('el-GR')} 
          icon={TrendingDown} 
          trend="down"
          change={`${movements.filter(m => m.type === 'out').length} κινήσεις`}
          className="border-l-4 border-l-orange-500"
        />
      </div>

      {/* Critical Alert αν υπάρχουν ελλείψεις */}
      {lowStockAlerts > 0 && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
          <div className="bg-red-500 p-2 rounded-xl text-white">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-red-900 font-black text-sm uppercase tracking-tighter">Προσοχή: Χαμηλό Απόθεμα</p>
            <p className="text-red-600 text-xs font-medium">Υπάρχουν {lowStockAlerts} προϊόντα που χρειάζονται αναπλήρωση άμεσα.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] p-2 shadow-sm border border-slate-100">
        <Tabs defaultValue="warehouses" className="w-full">
          <div className="px-6 pt-4 flex items-center justify-between">
            <TabsList className="bg-slate-100 p-1 rounded-xl">
              <TabsTrigger value="warehouses" className="rounded-lg font-bold text-xs uppercase italic">Αποθήκες</TabsTrigger>
              <TabsTrigger value="movements" className="rounded-lg font-bold text-xs uppercase italic">Κινήσεις Αποθέματος</TabsTrigger>
            </TabsList>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
              Nexus Logistics Engine
            </div>
          </div>

          <TabsContent value="warehouses" className="p-4 mt-2">
            <DataTable 
              columns={warehouseColumns} 
              data={warehouses} 
              onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} 
            />
          </TabsContent>
          <TabsContent value="movements" className="p-4 mt-2">
            <DataTable 
              columns={movementColumns} 
              data={movements} 
            />
          </TabsContent>
        </Tabs>
      </div>

      <EntityFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        title={editing?.id ? 'Επεξεργασία Αποθήκης' : 'Νέα Αποθήκη'} 
        fields={warehouseFields} 
        initialData={editing} 
        onSubmit={handleSubmit} 
      />
    </div>
  );
}
