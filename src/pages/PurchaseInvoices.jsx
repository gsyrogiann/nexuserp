import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import DocumentFormDialog from '../components/shared/DocumentFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { FileText, CreditCard, AlertTriangle } from 'lucide-react';

const columns = [
  { key: 'number', label: 'Invoice #' },
  { key: 'supplier_name', label: 'Supplier' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'total', label: 'Total', type: 'currency' },
  { key: 'paid_amount', label: 'Paid', type: 'currency' },
  { key: 'status', label: 'Status', type: 'status' },
];

export default function PurchaseInvoices() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();
  const { data: invoices } = useQuery({ queryKey: ['purchaseInvoices'], queryFn: () => base44.entities.PurchaseInvoice.list(), initialData: [] });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list(), initialData: [] });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list(), initialData: [] });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseInvoice.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseInvoices'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseInvoice.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseInvoices'] }),
  });

  const handleSubmit = async (data) => {
    if (editing?.id) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync({ ...data, status: 'draft', paid_amount: 0 });
    setEditing(null);
  };

  const totalPayables = invoices.reduce((s, i) => s + ((i.total || 0) - (i.paid_amount || 0)), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Invoices" subtitle={`${invoices.length} invoices`} actionLabel="New Invoice" onAction={() => { setEditing({}); setDialogOpen(true); }} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard label="Total Invoices" value={invoices.length} icon={FileText} />
        <StatsCard label="Total Payables" value={`€${totalPayables.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} icon={CreditCard} />
        <StatsCard label="Overdue" value={invoices.filter(i => i.status === 'overdue').length} icon={AlertTriangle} />
      </div>
      <DataTable columns={columns} data={invoices} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} />
      <DocumentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing?.id ? 'Edit Invoice' : 'New Purchase Invoice'} initialData={editing} onSubmit={handleSubmit} suppliers={suppliers} products={products} entityType="supplier" />
    </div>
  );
}