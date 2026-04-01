import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import { listCustomers } from '@/lib/directoryQueries';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot, Loader2, Sparkles, Mail, Activity, Info,
  GripVertical, ExternalLink, Copy, Trash2, User, Search, FilterX, Upload, Pencil,
  PhoneCall, Play, Headphones, BrainCircuit
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
  code: '', name: '', date: '', balance: 0, tax_id: '', address: '',
  profession: '', activity_sector: '', phone: '', tax_office: '',
  vat_category: '', region: '', postal_code: '', country: '',
  mobile: '', mobile2: '', bank_account: '', email: '', email2: '',
  category: 'wholesale', payment_terms: 0, credit_limit: 0,
  status: 'active', notes: '',
};

export default function Customers() {
  const [editing, setEditing] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [items, setItems] = useState([]);

  const qc = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => listCustomers(),
  });

  // VoIP Call Logs Query
  const { data: callLogs = [] } = useQuery({
    queryKey: ['callLogs', selectedCustomer?.id],
    queryFn: () => fetchList(base44.entities.CallLog, { 
      filter: { customer_id: selectedCustomer?.id },
      sort: '-created_date'
    }),
    enabled: !!selectedCustomer?.id
  });

  useEffect(() => {
    setItems(customers);
  }, [customers]);

  useEffect(() => {
    if (!selectedCustomer) return;
    const refreshed = customers.find((c) => c.id === selectedCustomer.id);
    if (refreshed) setSelectedCustomer(refreshed);
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

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lowSearch = searchTerm.toLowerCase();
    return items.filter(c => 
      c.name?.toLowerCase().includes(lowSearch) || 
      c.tax_id?.includes(searchTerm) ||
      c.code?.toLowerCase().includes(lowSearch)
    );
  }, [items, searchTerm]);

  const generateAISummary = async () => {
    if (!selectedCustomer) return;
    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Ανάλυσε τον πελάτη: ${selectedCustomer.name}. Υπόλοιπο: €${selectedCustomer.balance || 0}. Max 2 προτάσεις.`,
      });
      const reply = result && typeof result === 'object' && 'reply' in result && typeof result.reply === 'string'
        ? result.reply
        : null;
      setAiSummary(typeof result === 'string' ? result : reply || 'Η ανάλυση ολοκληρώθηκε χωρίς κείμενο απάντησης.');
    } finally {
      setAiLoading(false);
    }
  };

  const openInNewTab = (id) => {
    window.open(`${window.location.origin}/Customers?id=${id}`, '_blank');
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
        headers.forEach((h, i) => { obj[h] = values[i] || ''; });
        return obj;
      }).filter((r) => r.name);
      for (const record of records) { await createMutation.mutateAsync(record); }
    } finally {
      setImporting(false);
      setImportDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Αναζήτηση με Όνομα ή ΑΦΜ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-primary h-11 rounded-xl"
          />
        </div>
        <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="w-full sm:w-auto rounded-xl h-11 gap-2 border-slate-200 hover:bg-slate-50">
          <Upload className="w-4 h-4 text-slate-500" />
          {t.importFromExcelCSV}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-slate-100/50 p-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 flex px-6">
            <span className="flex-1">Πελάτης</span>
            <span>Υπόλοιπο</span>
          </div>

          <ScrollArea className="h-[calc(100vh-320px)] pr-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Φόρτωση πελατολογίου...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed">
                <FilterX className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs font-medium">Δεν βρέθηκαν πελάτες</p>
              </div>
            ) : (
              <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((customer) => (
                    <Reorder.Item
                      key={customer.id}
                      value={customer}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <Card
                            className={cn(
                              'cursor-pointer transition-all hover:shadow-md border-slate-200 rounded-xl overflow-hidden',
                              selectedCustomer?.id === customer.id ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : ''
                            )}
                            onClick={() => { setSelectedCustomer(customer); setAiSummary(''); }}
                          >
                            <CardContent className="p-4 flex items-center gap-4">
                              <GripVertical className="w-4 h-4 text-slate-300" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate text-slate-900">{customer.name}</p>
                                <p className="text-[10px] font-mono text-slate-500 uppercase">{customer.tax_id || 'Χωρίς ΑΦΜ'}</p>
                              </div>
                              <div className="text-right">
                                <p className={cn("text-sm font-black", customer.balance > 0 ? "text-red-600" : "text-emerald-600")}>
                                  €{(customer.balance || 0).toLocaleString('el-GR')}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56 rounded-xl shadow-xl border-slate-100">
                          <ContextMenuItem onClick={() => openInNewTab(customer.id)} className="gap-3 py-2.5">
                            <ExternalLink className="w-4 h-4 text-blue-500" /> Νέο Παράθυρο
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => navigator.clipboard.writeText(customer.tax_id || '')} className="gap-3 py-2.5">
                            <Copy className="w-4 h-4 text-slate-400" /> Αντιγραφή ΑΦΜ
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => setEditing(customer)} className="gap-3 py-2.5 font-bold">
                            <Pencil className="w-4 h-4 text-amber-500" /> Επεξεργασία
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => window.confirm('Οριστική διαγραφή;') && deleteMutation.mutate(customer.id)} className="gap-3 py-2.5 text-red-600 focus:bg-red-50">
                            <Trash2 className="w-4 h-4" /> Διαγραφή
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </ScrollArea>
        </div>

        {/* Details Area */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <Card className="sticky top-6 border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
              <CardHeader className="pb-0 pt-6 px-6 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-black tracking-tight text-slate-900">{selectedCustomer.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest">{selectedCustomer.category}</Badge>
                      <Badge className={cn("text-[9px] font-black uppercase tracking-widest", 
                        selectedCustomer.status === 'active' ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                        {selectedCustomer.status}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl font-bold px-5 border-slate-200" onClick={() => setEditing(selectedCustomer)}>Edit</Button>
                </div>

                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-6">
                    {['info', 'emails', 'calls', 'timeline'].map(tab => (
                      <TabsTrigger key={tab} value={tab} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 text-xs font-bold uppercase tracking-widest">
                        {tab === 'info' && <><Info className="w-3.5 h-3.5 mr-2" /> Στοιχεία</>}
                        {tab === 'emails' && <><Mail className="w-3.5 h-3.5 mr-2" /> Emails</>}
                        {tab === 'calls' && <><PhoneCall className="w-3.5 h-3.5 mr-2" /> Κλήσεις</>}
                        {tab === 'timeline' && <><Activity className="w-3.5 h-3.5 mr-2" /> Timeline</>}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="info" className="py-6 space-y-8 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <DetailItem label="ΑΦΜ / ΔΟΥ" value={`${selectedCustomer.tax_id || '—'} / ${selectedCustomer.tax_office || '—'}`} />
                        <DetailItem label="Τηλέφωνο" value={selectedCustomer.phone || '—'} />
                        <DetailItem label="Email" value={selectedCustomer.email || '—'} />
                        <DetailItem label="Διεύθυνση" value={`${selectedCustomer.address || '—'}, ${selectedCustomer.city || ''}`} />
                      </div>
                      <div className="space-y-4 text-right">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-black tracking-widest mb-1">Τρέχον Υπόλοιπο</span>
                          <span className={cn("text-3xl font-black tracking-tighter", selectedCustomer.balance > 0 ? "text-red-600" : "text-emerald-600")}>
                            €{(selectedCustomer.balance || 0).toLocaleString('el-GR')}
                          </span>
                        </div>
                        <DetailItem label="Πιστωτικό Όριο" value={`€${(selectedCustomer.credit_limit || 0).toLocaleString('el-GR')}`} align="right" />
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-lg relative overflow-hidden group border border-slate-800">
                      <Sparkles className="absolute top-0 right-0 w-32 h-32 text-white/5 -mr-8 -mt-8 rotate-12" />
                      <div className="relative z-10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Nexus Strategic AI</span>
                          </div>
                          <Button variant="secondary" size="xs" className="h-7 text-[10px] font-black bg-white/10 hover:bg-white/20 border-none text-white rounded-lg px-3" onClick={generateAISummary} disabled={aiLoading}>
                            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2 text-amber-400" />}
                            ΑΝΑΛΥΣΗ
                          </Button>
                        </div>
                        {aiSummary ? (
                          <p className="text-xs italic text-slate-200 leading-relaxed">"{aiSummary}"</p>
                        ) : (
                          <p className="text-[11px] text-slate-500">Ενεργοποιήστε την AI ανάλυση για στρατηγική σύνοψη.</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* VoIP Call Logs Tab */}
                  <TabsContent value="calls" className="py-6 animate-in fade-in">
                    <div className="space-y-4">
                       <ScrollArea className="h-[400px]">
                          {callLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                               <Headphones className="w-8 h-8 text-slate-200 mb-2" />
                               <p className="text-xs font-bold text-slate-400 uppercase">Δεν βρέθηκαν κλήσεις</p>
                            </div>
                          ) : (
                            <div className="space-y-3 pr-4">
                               {callLogs.map((call) => (
                                 <Card key={call.id} className="rounded-xl border-slate-100 hover:shadow-md transition-all group">
                                    <div className="p-4 flex items-center gap-4">
                                       <div className={cn("p-2 rounded-lg", call.type === 'in' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
                                          <PhoneCall className="w-4 h-4" />
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                             <span className="text-xs font-black italic">{new Date(call.created_date).toLocaleString('el-GR')}</span>
                                             <Badge className={cn("text-[8px] font-black px-1.5 h-4", 
                                                call.sentiment === 'positive' ? "bg-emerald-500" : 
                                                call.sentiment === 'angry' ? "bg-red-500" : "bg-slate-400")}>
                                                {call.sentiment || 'NEUTRAL'}
                                             </Badge>
                                          </div>
                                          <p className="text-[10px] text-slate-500 font-bold uppercase">{call.duration}s • {call.extension}</p>
                                       </div>
                                       <div className="flex gap-1">
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50">
                                             <Play className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50">
                                             <BrainCircuit className="w-3.5 h-3.5" />
                                          </Button>
                                       </div>
                                    </div>
                                 </Card>
                               ))}
                            </div>
                          )}
                       </ScrollArea>
                    </div>
                  </TabsContent>

                  <TabsContent value="emails" className="py-4">
                    <CustomerEmailsTab customerId={selectedCustomer.id} />
                  </TabsContent>

                  <TabsContent value="timeline" className="py-4">
                    <CustomerActivityTimeline customerId={selectedCustomer.id} />
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-300 bg-slate-50/50">
              <div className="p-6 rounded-full bg-white shadow-sm mb-4"><User className="w-10 h-10 opacity-20" /></div>
              <p className="text-sm font-bold tracking-tight">Επιλέξτε έναν πελάτη από τη λίστα</p>
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
        <DialogContent className="rounded-2xl border-none">
          <DialogHeader><DialogTitle className="font-black italic uppercase text-2xl">Nexus Data Import</DialogTitle></DialogHeader>
          <div className="py-6"><Input type="file" accept=".csv,.txt" onChange={handleFileImport} disabled={importing} className="rounded-xl" /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setImportDialogOpen(false)}>Κλείσιμο</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value, align = "left" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <span className="text-slate-400 block text-[10px] uppercase font-black tracking-widest mb-1">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}
