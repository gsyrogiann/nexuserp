import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers'; 
import { listSuppliers } from '@/lib/directoryQueries';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import DocumentFormDialog from '../components/shared/DocumentFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { ShoppingCart, Clock, CheckCircle } from 'lucide-react';

const columns = [
  { key: 'number', label: 'Order #' },
  { key: 'supplier_name', label: 'Supplier' }, // Διορθώθηκε σε Supplier
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'delivery_date', label: 'Expected Delivery', type: 'date' },
  { key: 'total', label: 'Total', type: 'currency' },
  { key: 'status', label: 'Status', type: 'status' },
];

export default function PurchaseOrders() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  // Fetch Purchase Orders
  const { data: orders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => fetchList(base44.entities.PurchaseOrder),
  });

  // Fetch Suppliers (για παραγγελίες αγοράς χρειαζόμαστε προμηθευτές)
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => listSuppliers(),
  });

  // Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchList(base44.entities.Product),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseOrders'] }),
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

  const active = orders.filter(o => !['received', 'cancelled'].includes(o.status)).length;
  const received = orders.filter(o => o.status === 'received').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle={`${orders.length} orders total`}
        actionLabel="New Purchase Order"
        onAction={handleNewAction}
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard label="Total Orders" value={orders.length} icon={ShoppingCart} />
        <StatsCard label="Pending" value={active} icon={Clock} />
        <StatsCard label="Received" value={received} icon={CheckCircle} />
      </div>

      <DataTable
        columns={columns}
        data={orders}
        onRowClick={handleRowClick}
      />

      <DocumentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing?.id ? 'Edit Purchase Order' : 'New Purchase Order'}
        initialData={editing}
        onSubmit={handleSubmit}
        customers={suppliers} // Περνάμε τους Suppliers στη θέση των Customers
        products={products}
        entityType="supplier" // Διορθώθηκε σε supplier
      />
    </div>
  );
}
