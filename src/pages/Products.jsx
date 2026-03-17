import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import EntityFormDialog from '../components/shared/EntityFormDialog';

const columns = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Product Name' },
  { key: 'category', label: 'Category', type: 'badge' },
  { key: 'buy_price', label: 'Buy Price', type: 'currency' },
  { key: 'sell_price', label: 'Sell Price', type: 'currency' },
  { key: 'vat_rate', label: 'VAT %', type: 'number' },
  { key: 'unit', label: 'Unit' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'sku', label: 'SKU Code', required: true, placeholder: 'e.g. PRD-001' },
  { key: 'name', label: 'Product Name', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'category', label: 'Category' },
  { key: 'unit', label: 'Unit', type: 'select', options: [
    { value: 'piece', label: 'Piece' }, { value: 'kg', label: 'Kilogram' },
    { value: 'liter', label: 'Liter' }, { value: 'meter', label: 'Meter' },
    { value: 'box', label: 'Box' }, { value: 'pallet', label: 'Pallet' }
  ]},
  { key: 'buy_price', label: 'Buy Price (€)', type: 'number' },
  { key: 'sell_price', label: 'Sell Price (€)', type: 'number' },
  { key: 'vat_rate', label: 'VAT Rate', type: 'select', options: [
    { value: '0', label: '0%' }, { value: '6', label: '6%' },
    { value: '13', label: '13%' }, { value: '24', label: '24%' }
  ]},
  { key: 'barcode', label: 'Barcode' },
  { key: 'min_stock', label: 'Minimum Stock', type: 'number' },
  { key: 'supplier_name', label: 'Primary Supplier' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'discontinued', label: 'Discontinued' }
  ]},
];

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list(), initialData: [] });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const handleSubmit = async (data) => {
    if (data.vat_rate) data.vat_rate = Number(data.vat_rate);
    if (editing?.id) await updateMutation.mutateAsync({ id: editing.id, data });
    else await createMutation.mutateAsync(data);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle={`${products.length} products in catalog`} actionLabel="New Product" onAction={() => { setEditing({}); setDialogOpen(true); }} />
      <DataTable columns={columns} data={products} onRowClick={(row) => { setEditing(row); setDialogOpen(true); }} />
      <EntityFormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing?.id ? 'Edit Product' : 'New Product'} fields={formFields} initialData={editing} onSubmit={handleSubmit} />
    </div>
  );
}