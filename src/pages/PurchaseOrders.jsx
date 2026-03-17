import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import DocumentFormDialog from '../components/shared/DocumentFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { ShoppingBag, Clock, CheckCircle, Truck } from 'lucide-react';

const columns = [
  { key: 'number', label: 'PO #' },
  { key: 'supplier_name', label: 'Supplier' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'expected_date', label: 'Expected', type: 'date' },
  { key: 'total', label: 'Total', type: 'currency' },
  { key: 'status', label: 'Status', type: 'status' },
];

export default function PurchaseOrders() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();
  const { data: orders } = useQuery({ queryKey: ['purchaseOrders'], queryFn: () => base44.entities.PurchaseOrder.list(), initialData: [] });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list(), initialData: [] });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list(), initialData: [] });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  });

  const handleSubmit = async (data) => {
    if (editing?.id) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync({ ...data, status: 'draft' });
    setEditing(null);
  };

  const pending = orders.filter(o => !['received', 'cancelled'].includes(o.status)).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" subtitle={`${orders.length} purchase orders`} actionLabel="New PO" onAction={() => { setEditing({}); setDialogOpen(true); }} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard label="Total POs" value={orders.length} icon={ShoppingBag} />
        <StatsCard label="Pending" value={pending} icon={Clock} />
        <StatsCard label="Received" value={orders.filter(o => o.status === 'received').length} icon={CheckCircle} />
      </div>
      <DataTable columns={columns} data={orders} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} />
      <DocumentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing?.id ? 'Edit PO' : 'New Purchase Order'} initialData={editing} onSubmit={handleSubmit} suppliers={suppliers} products={products} entityType="supplier" />
    </div>
  );
}