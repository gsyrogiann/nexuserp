import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import PageHeader from '../components/shared/PageHeader';
import EntityFormDialog from '../components/shared/EntityFormDialog';
import CustomerEmailsTab from '../components/email/CustomerEmailsTab';
import CustomerActivityTimeline from '../components/email/CustomerActivityTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator
} from '@/components/ui/context-menu';
import { Reorder, AnimatePresence } from 'framer-motion';
import {
  Bot, Loader2, Sparkles, Mail, Activity, Info,
  GripVertical, ExternalLink, Copy, Trash2, User
} from 'lucide-react';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';

const formFields = [
  { key: 'code', label: t.code },
  { key: 'name', label: t.companyName },
  { key: 'date', label: t.date, type: 'date' },
  { key: 'balance', label: t.balance, type: 'number' },
  { key: 'tax_id', label: t.vatNumber, placeholder: t.enterTaxId },
  { key: 'address', label: t.address },
  { key: 'profession', label: t.profession },
  { key: 'activity_sector', label: t.activitySector },
  { key: 'phone', label: t.phone1 },
  { key: 'tax_office', label: t.taxOffice },
  { key: 'vat_category', label: t.vatCategory },
  { key: 'region', label: t.region },
  { key: 'postal_code', label: t.postalCode },
  { key: 'country', label: t.country },
  { key: 'mobile', label: t.mobile },
  { key: 'mobile2', label: t.mobile2 },
  { key: 'bank_account', label: t.bankAccount },
  { key: 'email', label: t.email, type: 'email' },
  { key: 'email2', label: t.email2, type: 'email' },
  {
    key: 'category',
    label: t.category,
    type: 'select',
    options: [
      { value: 'wholesale', label: t.wholesale },
      { value: 'retail', label: t.retail },
      { value: 'government', label: t.government },
      { value: 'other', label: t.other }
    ]
  },
  { key: 'payment_terms', label: t.paymentTermsDays, type: 'number' },
  { key: 'credit_limit', label: t.creditLimit, type: 'number' },
  {
    key: 'status',
    label: t.status,
    type: 'select',
    options: [
      { value: 'active', label: t.active },
      { value: 'inactive', label: t.inactive },
      { value: 'blocked', label: t.blocked }
    ]
  },
  { key: 'notes', label: t.notes, type: 'textarea' },
];

const emptyCustomer = {
  code: '',
  name: '',
  date: '',
  balance: 0,
  tax_id: '',
  address: '',
  profession: '',
  activity_sector: '',
  phone: '',
  tax_office: '',
  vat_category: '',
  region: '',
  postal_code: '',
  country: '',
  mobile: '',
  mobile2: '',
  bank_account: '',
  email: '',
  email2: '',
  category: 'wholesale',
  payment_terms: 0,
  credit_limit: 0,
  status: 'active',
  notes: '',
};

export default function Customers() {
  const [editing, setEditing] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [searchTax, setSearchTax] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [items, setItems] = useState([]);

  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchList(base44.entities.Customer),
  });

  useEffect(() => {
    setItems(customers);
  }, [customers]);

  useEffect(() => {
    if (!selectedCustomer) return;
    const refreshedSelected = customers.find((c) => c.id === selectedCustomer.id);
    if (refreshedSelected) {
      setSelectedCustomer(refreshedSelected);
    }
  }, [customers, selectedCustomer]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setSelectedCustomer(null);
    },
  });

  const handleSubmit = async (data) => {
    if (editing?.id) {
      await updateMutation.mutateAsync({ id: editing.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setEditing(null);
  };

  const openInNewTab = (id) => {
    const url = `${window.location.origin}/customers?id=${id}`;
    window.open(url, '_blank');
  };

  const generateAISummary = async () => {
    if (!selectedCustomer) return;

    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a brief business summary for: ${selectedCustomer.name}. Balance: €${selectedCustomer.balance || 0}. Max 2 sentences.`,
      });
      setAiSummary(result);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

      const records = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || '';
        });
        return obj;
      }).filter((r) => r.name);

      for (const record of records) {
        await createMutation.mutateAsync(record);
      }
    } finally {
      setImporting(false);
      setImportDialogOpen(false);
    }
  };

  const filteredItems = searchTax
    ? items.filter((c) => c.tax_id?.includes(searchTax))
    : items;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={t.customers}
        subtitle={`${customers.length} ${t.total.toLowerCase()}`}
        actionLabel={t.newCustomer}
        onAction={() => {
          setSelectedCustomer(null);
          setAiSummary('');
          setEditing({ ...emptyCustomer });
        }}
      />

      <div className="flex items-center gap-4">
        <Input
          placeholder="Αναζήτηση με ΑΦΜ..."
          value={searchTax}
          onChange={(e) => setSearchTax(e.target.value)}
          className="max-w-sm bg-white"
        />
        <Button onClick={() => setImportDialogOpen(true)} variant="outline">
          {t.importFromExcelCSV}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-muted/50 p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex px-4">
            <span className="w-8"></span>
            <span className="flex-1">Όνομα Πελάτη</span>
            <span>Υπόλοιπο</span>
          </div>

          <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
            <AnimatePresence>
              {filteredItems.map((customer) => (
                <Reorder.Item
                  key={customer.id}
                  value={customer}
                  className="relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:border-primary/50 select-none',
                          selectedCustomer?.id === customer.id ? 'border-primary bg-primary/5' : ''
                        )}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setAiSummary('');
                        }}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab active:cursor-grabbing" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{customer.name}</p>
                            <p className="text-[10px] text-muted-foreground">{customer.tax_id || 'Χωρίς ΑΦΜ'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono font-bold">
                              €{(customer.balance || 0).toLocaleString('el-GR')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </ContextMenuTrigger>

                    <ContextMenuContent className="w-56">
                      <ContextMenuItem onClick={() => openInNewTab(customer.id)} className="gap-2">
                        <ExternalLink className="w-4 h-4 text-blue-500" />
                        Άνοιγμα σε νέο παράθυρο
                      </ContextMenuItem>

                      <ContextMenuItem
                        onClick={() => navigator.clipboard.writeText(customer.tax_id || '')}
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Αντιγραφή ΑΦΜ
                      </ContextMenuItem>

                      <ContextMenuSeparator />

                      <ContextMenuItem
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setAiSummary('');
                          setEditing(customer);
                        }}
                        className="gap-2"
                      >
                        <User className="w-4 h-4" />
                        Επεξεργασία
                      </ContextMenuItem>

                      <ContextMenuItem
                        onClick={() => window.confirm('Διαγραφή;') && deleteMutation.mutate(customer.id)}
                        className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Διαγραφή
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>

        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <Card className="sticky top-6">
              <CardHeader className="pb-0 pt-4 px-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <CardTitle className="text-xl">{selectedCustomer.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {selectedCustomer.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase bg-emerald-50 text-emerald-700 border-emerald-100"
                      >
                        {selectedCustomer.status}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing(selectedCustomer)}>
                    Edit
                  </Button>
                </div>

                <Tabs defaultValue="info">
                  <TabsList>
                    <TabsTrigger value="info" className="gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      Στοιχεία
                    </TabsTrigger>
                    <TabsTrigger value="emails" className="gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Emails
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      Timeline
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="py-4 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <p>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                            ΑΦΜ / ΔΟΥ
                          </span>
                          {selectedCustomer.tax_id || '—'} / {selectedCustomer.tax_office || '—'}
                        </p>
                        <p>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                            Τηλέφωνο
                          </span>
                          {selectedCustomer.phone || '—'}
                        </p>
                        <p>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                            Email
                          </span>
                          {selectedCustomer.email || '—'}
                        </p>
                      </div>
                      <div className="space-y-3 text-right">
                        <p>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold text-right">
                            Υπόλοιπο
                          </span>
                          <span className="text-2xl font-black text-primary">
                            €{(selectedCustomer.balance || 0).toLocaleString('el-GR')}
                          </span>
                        </p>
                        <p>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold text-right">
                            Πιστωτικό Όριο
                          </span>
                          €{(selectedCustomer.credit_limit || 0).toLocaleString('el-GR')}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between hover:bg-primary/5 group"
                        onClick={generateAISummary}
                        disabled={aiLoading}
                      >
                        <span className="flex items-center gap-2 font-bold text-xs uppercase tracking-tight">
                          {aiLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Bot className="w-3 h-3 text-primary" />
                          )}
                          Ανάλυση AI
                        </span>
                        <Sparkles className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>

                      {aiSummary && (
                        <p className="mt-3 text-xs leading-relaxed text-slate-600 bg-white p-3 rounded-lg border italic">
                          "{aiSummary}"
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="emails">
                    <CustomerEmailsTab customerId={selectedCustomer.id} />
                  </TabsContent>

                  <TabsContent value="timeline">
                    <CustomerActivityTimeline customerId={selectedCustomer.id} />
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-2xl text-muted-foreground">
              <User className="w-12 h-12 mb-2 opacity-10" />
              <p className="text-sm font-medium">Επιλέξτε έναν πελάτη για λεπτομέρειες</p>
            </div>
          )}
        </div>
      </div>

      <EntityFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing?.id ? t.editCustomer : t.newCustomer}
        fields={formFields}
        initialData={editing || emptyCustomer}
        onSubmit={handleSubmit}
      />

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.importDialogTitle}</DialogTitle>
          </DialogHeader>
          <Input type="file" accept=".csv,.txt" onChange={handleFileImport} disabled={importing} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Κλείσιμο
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
