import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers'; 
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import DocumentFormDialog from '../components/shared/DocumentFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { FileText, Check, Clock } from 'lucide-react';
 
const columns = [
  { key: 'number', label: 'Quote #' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'valid_until', label: 'Valid Until', type: 'date' },
  { key: 'total', label: 'Total', type: 'currency' },
  { key: 'status', label: 'Status', type: 'status' },
];
 
export default function Quotes() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();
 
  // Fetch Quotes
  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => fetchList(base44.entities.Quote),
  });
 
  // Fetch Customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchList(base44.entities.Customer),
  });
 
  // Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchList(base44.entities.Product),
  });
 
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Quote.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
 
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quote.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
 
  const handleSubmit = async (data) => {
    if (editing?.id) {
      await updateMutation.mutateAsync({ id: editing.id, data });
    } else {
      await createMutation.mutateAsync({ ...data, status: 'draft' });
    }
    setEditing(null);
    setDialogOpen(false);
  };

  const handleRowClick = (row) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const handleNewAction = () => {
    setEditing({});
    setDialogOpen(true);
  };
 
  const accepted = quotes.filter(q => q.status === 'accepted').length;
  const pending = quotes.filter(q => q.status === 'sent' || q.status === 'draft').length;
 
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        subtitle={`${quotes.length} quotes`}
        actionLabel="New Quote"
        onAction={handleNewAction}
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard label="Total Quotes" value={quotes.length} icon={FileText} />
        <StatsCard label="Accepted" value={accepted} icon={Check} />
        <StatsCard label="Pending" value={pending} icon={Clock} />
      </div>

      <DataTable
        columns={columns}
        data={quotes}
        onRowClick={handleRowClick}
      />

      <DocumentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing?.id ? 'Edit Quote' : 'New Quote'}
        initialData={editing}
        onSubmit={handleSubmit}
        customers={customers}
        products={products}
        entityType="customer"
      />
    </div>
  );
}
