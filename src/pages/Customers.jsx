import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import EntityFormDialog from '../components/shared/EntityFormDialog';
import CustomerEmailsTab from '../components/email/CustomerEmailsTab';
import CustomerActivityTimeline from '../components/email/CustomerActivityTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Bot, Loader2, Sparkles, Mail, Activity, Info } from 'lucide-react';
import { t } from '@/lib/translations';

const columns = [
  { key: 'name', label: t.name },
  { key: 'tax_id', label: t.taxId },
  { key: 'city', label: t.city },
  { key: 'phone', label: t.phone },
  { key: 'category', label: t.category, type: 'badge' },
  { key: 'balance', label: t.balance, type: 'currency' },
  { key: 'status', label: t.status, type: 'status' },];

const formFields = [
  { key: 'tax_id', label: t.vatNumber, placeholder: t.enterTaxId },
  { key: 'tax_office', label: t.taxOffice },
  { key: 'email', label: t.email, type: 'email' },
  { key: 'phone', label: t.phone },
  { key: 'address', label: t.address },
  { key: 'city', label: t.city },
  { key: 'postal_code', label: t.postalCode },
  { key: 'contact_person', label: t.contactPerson },
  { key: 'category', label: t.category, type: 'select', options: [    { value: 'wholesale', label: t.wholesale }, { value: 'retail', label: t.retail },
    { value: 'government', label: t.government }, { value: 'other', label: t.other }  ]},
  { key: 'payment_terms', label: t.paymentTermsDays, type: 'number' },
  { key: 'credit_limit', label: t.creditLimit, type: 'number' },
  { key: 'status', label: t.status, type: 'select', options: [
    { value: 'active', label: t.active }, { value: 'inactive', label: t.inactive }, { value: 'blocked', label: t.blocked } ]},
  { key: 'notes', label: t.notes, type: 'textarea' },];

export default function Customers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
    const [searchTax, setSearchTax] = useState('');
    const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
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

  const filteredCustomers = searchTax ? customers.filter(c => c.tax_id && c.tax_id.includes(searchTax)) : customers;

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

    const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = text.split('\n').filter(row => row.trim());
        
        // Skip header row
        const dataRows = rows.slice(1);

                // Detect delimiter (comma or semicolon)
        const firstRow = dataRows[0] || '';
        const delimiter = firstRow.includes(';') ? ';' : ',';
        
        for (const row of dataRows) {
          const columns = row.split(delimiter).map(col => col.trim().replace(/^"|"$/g, ''));          
          // Expected format: name, tax_id, city, phone, email, address, category, payment_terms
          const customerData = {
            name: columns[0] || '',
            tax_id: columns[1] || '',
            city: columns[2] || '',
            phone: columns[3] || '',
            email: columns[4] || '',
            address: columns[5] || '',
            category: columns[6] || 'retail',
            payment_terms: parseInt(columns[7]) || 30,
            status: 'active'
          };

          if (customerData.name) {
            await createMutation.mutateAsync(customerData);
          }
        }
        
        setImportDialogOpen(false);
        alert(`Εισήχθησαν ${dataRows.length} πελάτες επιτυχώς!`);
      } catch (error) {
        console.error('Import error:', error);
        alert('Σφάλμα κατά την εισαγωγή: ' + error.message);
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t.customers} subtitle={`${customers.length} ${t.total.toLowerCase()}`} actionLabel={t.newCustomer} onAction={() => { setEditing(null); setDialogOpen(true); }} />            
      <div className="flex gap-2 mb-4">
        <Button onClick={() => setImportDialogOpen(true)} variant="outline">
          Εισαγωγή από Excel/CSV
        </Button>
      </div>

      <Input placeholder="Αναζήτηση με ΑΦΜ..." value={searchTax} onChange={(e) => setSearchTax(e.target.value)} className="max-w-sm" />

      {selectedCustomer ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <DataTable columns={columns} data={filteredCustomers} onRowClick={handleRowClick} pageSize={8} />
          </div>

          {/* Customer detail with tabs */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader className="pb-0 pt-4 px-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <CardTitle className="text-lg">{selectedCustomer.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.email || ''} {selectedCustomer.phone ? `· ${selectedCustomer.phone}` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(selectedCustomer); setDialogOpen(true); }}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>✕</Button>
                  </div>
                </div>

                <Tabs defaultValue="info">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="info" className="gap-1.5 text-xs"><Info className="w-3.5 h-3.5" />Στοιχεία</TabsTrigger>
                    <TabsTrigger value="emails" className="gap-1.5 text-xs"><Mail className="w-3.5 h-3.5" />Emails</TabsTrigger>
                    <TabsTrigger value="timeline" className="gap-1.5 text-xs"><Activity className="w-3.5 h-3.5" />Timeline</TabsTrigger>
                  </TabsList>

                  {/* Info tab */}
                  <TabsContent value="info" className="px-1 py-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">ΑΦΜ:</span> {selectedCustomer.tax_id || '—'}</div>
                        <div><span className="text-muted-foreground">ΔΟΥ:</span> {selectedCustomer.tax_office || '—'}</div>
                        <div><span className="text-muted-foreground">Phone:</span> {selectedCustomer.phone || '—'}</div>
                        <div><span className="text-muted-foreground">Email:</span> {selectedCustomer.email || '—'}</div>
                        <div><span className="text-muted-foreground">City:</span> {selectedCustomer.city || '—'}</div>
                        <div><span className="text-muted-foreground">Terms:</span> {selectedCustomer.payment_terms || 30}d</div>
                        <div><span className="text-muted-foreground">Credit Limit:</span> €{(selectedCustomer.credit_limit || 0).toLocaleString('el-GR')}</div>
                        <div><span className="text-muted-foreground">Category:</span> {selectedCustomer.category || '—'}</div>
                      </div>
                      <div className="pt-3 border-t flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Υπόλοιπο</span>
                        <span className="text-xl font-bold">€{(selectedCustomer.balance || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}</span>
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
                    </div>
                  </TabsContent>

                  {/* Emails tab */}
                  <TabsContent value="emails" className="px-1 py-4">
                    <CustomerEmailsTab customerId={selectedCustomer.id} />
                  </TabsContent>

                  {/* Timeline tab */}
                  <TabsContent value="timeline" className="px-1 py-4">
                    <CustomerActivityTimeline customerId={selectedCustomer.id} />
                  </TabsContent>
                </Tabs>
              </CardHeader>
              <CardContent className="px-5 pb-5" />
            </Card>
          </div>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredCustomers} onRowClick={handleRowClick} />
      )}

      <EntityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing?.id ? t.editCustomer : t.newCustomer}        fields={formFields}
        initialData={editing}
        onSubmit={handleSubmit}
      />

            {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.importDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t.importDialogDescription}<br />
              <code>{t.csvFormat}</code>
            </p>
            <Input 
              type="file" 
              accept=".csv,.txt"
              onChange={handleFileImport}
              disabled={importing}
            />
            {importing && <p className="text-sm">{t.importInProgress}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>
              {t.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}