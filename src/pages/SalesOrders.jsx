import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers'; 
import { listCustomers } from '@/lib/directoryQueries';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import DocumentFormDialog from '../components/shared/DocumentFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { ShoppingCart, Clock, CheckCircle } from 'lucide-react';

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

  // Fetch Sales Orders
  const { data: orders = [] } = useQuery({ 
    queryKey: ['salesOrders'], 
    queryFn: () => fetchList(base44.entities.SalesOrder), 
  });

  // Fetch Customers
  const { data: customers = [] } = useQuery({ 
    queryKey: ['customers'], 
    queryFn: () => listCustomers(), 
  });

  // Fetch Products
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

  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'delivered').length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Sales Orders" 
        subtitle={`${orders.length} orders`} 
        actionLabel="New Order" 
        onAction={handleNewAction} 
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard label="Total Orders" value={orders.length} icon={ShoppingCart} />
        <StatsCard label="Active" value={active} icon={Clock} />
        <StatsCard label="Delivered" value={delivered} icon={CheckCircle} />
      </div>

      <DataTable 
        columns={columns} 
        data={orders} 
        onRowClick={handleRowClick} 
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
