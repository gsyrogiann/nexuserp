import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import DocumentFormDialog from '../components/shared/DocumentFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { FileText, CreditCard, AlertTriangle } from 'lucide-react';

const columns = [
  { key: 'number', label: 'Invoice #' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'total', label: 'Total', type: 'currency' },
  { key: 'paid_amount', label: 'Paid', type: 'currency' },
  { key: 'status', label: 'Status', type: 'status' },
];

function getNextInvoiceNumber(invoices = []) {
  const numericValues = invoices
    .map((invoice) => String(invoice.number || '').trim())
    .map((number) => {
      const match = number.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((value) => Number.isInteger(value));

  const maxNumber = numericValues.length > 0 ? Math.max(...numericValues) : 0;
  return String(maxNumber + 1).padStart(3, '0');
}

export default function SalesInvoices() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const qc = useQueryClient();

  const { data: invoices = [] } = useQuery({
    queryKey: ['salesInvoices'],
    queryFn: () => fetchList(base44.entities.SalesInvoice),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchList(base44.entities.Customer),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchList(base44.entities.Product),
  });

  const nextInvoiceNumber = useMemo(() => {
    return getNextInvoiceNumber(invoices);
  }, [invoices]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SalesInvoice.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salesInvoices'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SalesInvoice.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salesInvoices'] }),
  });

  const handleSubmit = async (data) => {
    const payload = {
      ...data,
      customer_id: data.customer_id || data.customer_name || 'manual_entry',
    };

    if (editing?.id) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createMutation.mutateAsync({
        ...payload,
        number: data.number || nextInvoiceNumber,
        status: 'draft',
        paid_amount: 0,
      });
    }

    setEditing(null);
    setDialogOpen(false);
  };

  const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const overdue = invoices.filter((i) => i.status === 'overdue').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices"
        subtitle={`${invoices.length} invoices`}
        actionLabel="New Invoice"
        onAction={() => {
          setEditing({
            number: nextInvoiceNumber,
            date: new Date().toISOString().split('T')[0],
            notes: '',
            customer_id: '',
            items: [],
          });
          setDialogOpen(true);
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatsCard
          label="Total Invoiced"
          value={`€${totalRevenue.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`}
          icon={FileText}
        />

        <StatsCard
          label="Total Paid"
          value={`€${totalPaid.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`}
          icon={CreditCard}
        />

        <StatsCard
          label="Outstanding"
          value={`€${(totalRevenue - totalPaid).toLocaleString('el-GR', { minimumFractionDigits: 2 })}`}
          icon={AlertTriangle}
        />

        <StatsCard
          label="Overdue"
          value={overdue}
          icon={AlertTriangle}
          change={overdue > 0 ? 'Needs attention' : 'All clear'}
          trend={overdue > 0 ? 'down' : 'up'}
        />
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        onRowClick={(row) => {
          setEditing(row);
          setDialogOpen(true);
        }}
      />

      <DocumentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing?.id ? 'Edit Invoice' : 'New Sales Invoice'}
        initialData={editing}
        onSubmit={handleSubmit}
        customers={customers}
        products={products}
        entityType="customer"
      />
    </div>
  );
}
