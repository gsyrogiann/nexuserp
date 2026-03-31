import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { listSuppliers } from '@/lib/directoryQueries';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import EntityFormDialog from '../components/shared/EntityFormDialog';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'tax_id', label: 'ΑΦΜ' },
  { key: 'city', label: 'City' },
  { key: 'phone', label: 'Phone' },
  { key: 'category', label: 'Category', type: 'badge' },
  { key: 'balance', label: 'Balance', type: 'currency' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'name', label: 'Company Name', required: true },
  { key: 'tax_id', label: 'ΑΦΜ (VAT Number)' },
  { key: 'tax_office', label: 'ΔΟΥ' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'postal_code', label: 'Postal Code' },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'category', label: 'Category', type: 'select', options: [
    { value: 'manufacturer', label: 'Manufacturer' },
    { value: 'distributor', label: 'Distributor' },
    { value: 'importer', label: 'Importer' },
    { value: 'other', label: 'Other' }
  ]},
  { key: 'payment_terms', label: 'Payment Terms (days)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]},
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Suppliers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  // Fetch Suppliers list
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => listSuppliers(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const handleSubmit = async (data) => {
    if (editing?.id) {
      await updateMutation.mutateAsync({ id: editing.id, data });
    } else {
      await createMutation.mutateAsync(data);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} total suppliers`}
        actionLabel="New Supplier"
        onAction={handleNewAction}
      />
      <DataTable
        columns={columns}
        data={suppliers}
        onRowClick={handleRowClick}
      />
      <EntityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing?.id ? 'Edit Supplier' : 'New Supplier'}
        fields={formFields}
        initialData={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
