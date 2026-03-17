import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import EntityFormDialog from '../components/shared/EntityFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const columns = [
  { key: 'number', label: 'Payment #' },
  { key: 'entity_name', label: 'Customer/Supplier' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'method', label: 'Method', type: 'badge' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'number', label: 'Payment Number', placeholder: 'e.g. PAY-001' },
  { key: 'type', label: 'Type', type: 'select', options: [
    { value: 'incoming', label: 'Incoming (Customer)' }, { value: 'outgoing', label: 'Outgoing (Supplier)' }
  ]},
  { key: 'entity_name', label: 'Customer / Supplier Name' },
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'amount', label: 'Amount (€)', type: 'number' },
  { key: 'method', label: 'Method', type: 'select', options: [
    { value: 'cash', label: 'Cash' }, { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' }, { value: 'credit_card', label: 'Credit Card' }, { value: 'other', label: 'Other' }
  ]},
  { key: 'reference', label: 'Reference (bank ref, check #)' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' },
    { value: 'bounced', label: 'Bounced' }, { value: 'cancelled', label: 'Cancelled' }
  ]},
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Payments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('all');
  const qc = useQueryClient();
  const { data: payments } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list(), initialData: [] });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Payment.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payment.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });

  const handleSubmit = async (data) => {
    if (editing?.id) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync(data);
    setEditing(null);
  };

  const incoming = payments.filter(p => p.type === 'incoming' && p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
  const outgoing = payments.filter(p => p.type === 'outgoing' && p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
  const filtered = tab === 'all' ? payments : payments.filter(p => p.type === tab);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Receivables & Payables" actionLabel="New Payment" onAction={() => { setEditing({}); setDialogOpen(true); }} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard label="Total Incoming" value={`€${incoming.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} icon={ArrowDownLeft} />
        <StatsCard label="Total Outgoing" value={`€${outgoing.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} icon={ArrowUpRight} />
        <StatsCard label="Net Cash Flow" value={`€${(incoming - outgoing).toLocaleString('el-GR', { minimumFractionDigits: 2 })}`} icon={CreditCard} trend={incoming >= outgoing ? 'up' : 'down'} />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="incoming">Incoming</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable columns={columns} data={filtered} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} />
      <EntityFormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing?.id ? 'Edit Payment' : 'New Payment'} fields={formFields} initialData={editing} onSubmit={handleSubmit} />
    </div>
  );
}