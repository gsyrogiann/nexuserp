import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import EntityFormDialog from '../components/shared/EntityFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, Package, ArrowDownUp } from 'lucide-react';

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
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: () => base44.entities.Warehouse.list(), initialData: [] });
  const { data: movements } = useQuery({ queryKey: ['stockMovements'], queryFn: () => base44.entities.StockMovement.list('-created_date', 50), initialData: [] });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list(), initialData: [] });

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
  };

  const totalIn = movements.filter(m => m.type === 'in').reduce((s, m) => s + (m.quantity || 0), 0);
  const totalOut = movements.filter(m => m.type === 'out').reduce((s, m) => s + (m.quantity || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="Warehouses & stock management" actionLabel="New Warehouse" onAction={() => { setEditing({}); setDialogOpen(true); }} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard label="Warehouses" value={warehouses.length} icon={Warehouse} />
        <StatsCard label="Stock In" value={totalIn.toLocaleString('el-GR')} icon={Package} change="Total units received" />
        <StatsCard label="Stock Out" value={totalOut.toLocaleString('el-GR')} icon={ArrowDownUp} change="Total units dispatched" />
      </div>

      <Tabs defaultValue="warehouses">
        <TabsList>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>
        <TabsContent value="warehouses" className="mt-4">
          <DataTable columns={warehouseColumns} data={warehouses} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} />
        </TabsContent>
        <TabsContent value="movements" className="mt-4">
          <DataTable columns={movementColumns} data={movements} />
        </TabsContent>
      </Tabs>

      <EntityFormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing?.id ? 'Edit Warehouse' : 'New Warehouse'} fields={warehouseFields} initialData={editing} onSubmit={handleSubmit} />
    </div>
  );
}