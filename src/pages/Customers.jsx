import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import EntityFormDialog from '../components/shared/EntityFormDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, Sparkles } from 'lucide-react';

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
  { key: 'tax_id', label: 'ΑΦΜ (VAT Number)', placeholder: 'e.g. 123456789' },
  { key: 'tax_office', label: 'ΔΟΥ' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'postal_code', label: 'Postal Code' },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'category', label: 'Category', type: 'select', options: [
    { value: 'wholesale', label: 'Wholesale' }, { value: 'retail', label: 'Retail' },
    { value: 'government', label: 'Government' }, { value: 'other', label: 'Other' }
  ]},
  { key: 'payment_terms', label: 'Payment Terms (days)', type: 'number' },
  { key: 'credit_limit', label: 'Credit Limit (€)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'blocked', label: 'Blocked' }
  ]},
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Customers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const qc = useQueryClient();
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list(), initialData: [] });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const handleSubmit = async (data) => {
    if (editing?.id) {
      await updateMutation.mutateAsync({ id: editing.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditing(null);
  };

  const handleRowClick = (row) => {
    setSelectedCustomer(row);
    setAiSummary('');
  };

  const generateAISummary = async () => {
    if (!selectedCustomer) return;
    setAiLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a brief professional business summary for this customer:
Name: ${selectedCustomer.name}, Category: ${selectedCustomer.category}, City: ${selectedCustomer.city}, Balance: €${selectedCustomer.balance || 0}, Payment Terms: ${selectedCustomer.payment_terms || 30} days, Status: ${selectedCustomer.status}. 
Provide a 2-3 sentence summary including risk assessment and recommendations.`,
    });
    setAiSummary(result);
    setAiLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" subtitle={`${customers.length} total customers`} actionLabel="New Customer" onAction={() => { setEditing({}); setDialogOpen(true); }} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedCustomer ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <DataTable
            columns={columns}
            data={customers}
            onRowClick={handleRowClick}
          />
        </div>

        {selectedCustomer && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{selectedCustomer.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">ΑΦΜ:</span> {selectedCustomer.tax_id || '—'}</div>
                <div><span className="text-muted-foreground">ΔΟΥ:</span> {selectedCustomer.tax_office || '—'}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedCustomer.phone || '—'}</div>
                <div><span className="text-muted-foreground">Email:</span> {selectedCustomer.email || '—'}</div>
                <div><span className="text-muted-foreground">City:</span> {selectedCustomer.city || '—'}</div>
                <div><span className="text-muted-foreground">Terms:</span> {selectedCustomer.payment_terms || 30}d</div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance</span>
                  <span className="text-lg font-bold">€{(selectedCustomer.balance || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="pt-2 border-t space-y-2">
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={generateAISummary} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                  AI Summary
                </Button>
                {aiSummary && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs leading-relaxed">
                    <Sparkles className="w-3 h-3 text-primary inline mr-1" />
                    {aiSummary}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setEditing(selectedCustomer); setDialogOpen(true); }}>
                Edit Customer
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <EntityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing?.id ? 'Edit Customer' : 'New Customer'}
        fields={formFields}
        initialData={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}