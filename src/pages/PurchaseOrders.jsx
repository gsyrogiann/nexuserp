import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers'; // ✅ ΠΡΟΣΘΗΚΗ
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import DocumentFormDialog from '../components/shared/DocumentFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { ShoppingCart, Truck, Clock, CheckCircle } from 'lucide-react';

const columns = [
  { key: 'number', label: 'Order #' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'delivery_date', label: 'Delivery', type: 'date' },
  { key: 'total', label: 'Total', type: 'currency' },
  { key: 'status', label: 'Status', type: 'status' },
];

export default function SalesOrders() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  // ✅ ΔΙΟΡΘΩΣΗ: fetchList αντί για .list()
  const { data: orders = [] } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: () => fetchList(base44.entities.SalesOrder),
  });

  // ✅ ΔΙΟΡΘΩΣΗ: fetchList αντί για .list()
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchList(base44.entities.Customer),
  });

  // ✅ ΔΙΟΡΘΩΣΗ: fetchList αντί για .list()
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchList(base44.entities.Product),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SalesOrder.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salesOrders'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SalesOrder.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salesOrders'] }),
  });

  const handleSubmit = async (data) => {
    if (editing?.id) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync({ ...data, status: 'draft' });
    setEditing(null);
  };

  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'delivered').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        subtitle={`${orders.length} orders`}
        actionLabel="New Order"
        onAction={() => { setEditing({}); setDialogOpen(true); }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard label="Total Orders" value={orders.length} icon={ShoppingCart} />
        <StatsCard label="Active" value={active} icon={Clock} />
        <StatsCard label="Delivered" value={delivered} icon={CheckCircle} />
      </div>
      <DataTable
        columns={columns}
        data={orders}
        onRowClick={(row) => { setEditing(row); setDialogOpen(true); }}
      />
      <DocumentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing?.id ? 'Edit Order' : 'New Sales Order'}
        initialData={editing}
        onSubmit={handleSubmit}
        customers={customers}
        products={products}
        entityType="customer"
      />
    </div>
  );
}
