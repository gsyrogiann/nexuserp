import React, { useState, useEffect, useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot, Loader2, Sparkles, Mail, Activity, Info,
  GripVertical, ExternalLink, Copy, Trash2, User, Search, FilterX, Upload, Pencil,
  PhoneCall, Play, MessageSquare, BrainCircuit, Headphones
} from 'lucide-react';
import { t } from '@/lib/translations';
import { cn } from '@/lib/utils';

// --- ΦΟΡΜΑ ΠΕΛΑΤΗ ---
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

  // Queries
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchList(base44.entities.Customer),
  });

  // VoIP Call Logs Query (Προετοιμασία για 3CX API)
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

  // Mutations
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

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  tax_id: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                }
              }
            }
          }
        }
      });
      const rows = result?.output?.items || result?.output || [];
      if (rows.length > 0) {
        await base44.entities.Customer.bulkCreate(rows);
        qc.invalidateQueries({ queryKey: ['customers'] });
      }
    } finally {
      setImporting(false);
      setImportDialogOpen(false);
    }
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
        prompt: `Δημιούργησε μια σύντομη επιχειρηματική ανάλυση για τον πελάτη: ${selectedCustomer.name}. Υπόλοιπο: €${selectedCustomer.balance || 0}. Ανέφερε αν είναι στρατηγικός συνεργάτης ή αν υπάρχει ρίσκο. Max 2 προτάσεις στα Ελληνικά.`,
      });
      setAiSummary(result);
    } finally {
      setAiLoading(false);
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
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 font-mono">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-[10px] uppercase tracking-widest">Nexus Syncing...</p>
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
                              'cursor-pointer transition-all hover:shadow-md border-slate-200 rounded-xl overflow-hidden group',
                              selectedCustomer?.id === customer.id ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : ''
                            )}
                            onClick={() => { setSelectedCustomer(customer); setAiSummary(''); }}
                          >
                            <CardContent className="p-4 flex items-center gap-4">
                              <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate text-slate-900">{customer.name}</p>
                                <p className="text-[10px] font-mono text-slate-500 uppercase">{customer.tax_id || 'Χωρίς ΑΦΜ'}</p>
                              </div>
                              <div className="text-right">
                                <p className={cn("text-sm font-black italic", customer.balance > 0 ? "text-red-600" : "text-emerald-600")}>
                                  €{(customer.balance || 0).toLocaleString('el-GR')}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56 rounded-xl shadow-xl border-slate-100">
                          <ContextMenuItem onClick={() => window.open(`${window.location.origin}/Customers?id=${customer.id}`, '_blank')} className="gap-3 py-2.5">
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
            <Card className="sticky top-6 border-slate-200 shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
              <CardHeader className="pb-0 pt-8 px-8 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="space-y-1">
                    <CardTitle className="text-3xl font-black tracking-tight text-slate-900 italic uppercase italic tracking-tighter">{selectedCustomer.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">{selectedCustomer.category}</Badge>
                      <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg", 
                        selectedCustomer.status === 'active' ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                        {selectedCustomer.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100">
                        <PhoneCall className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl font-bold px-6 h-10 border-slate-200" onClick={() => setEditing(selectedCustomer)}>Edit</Button>
                  </div>
                </div>

                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
                    {['info', 'emails', 'calls', 'timeline'].map(tab => (
                      <TabsTrigger key={tab} value={tab} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-4 text-[10px] font-black uppercase tracking-widest">
                        {tab === 'info' && <><Info className="w-3.5 h-3.5 mr-2" /> Στοιχεία</>}
                        {tab === 'emails' && <><Mail className="w-3.5 h-3.5 mr-2" /> Emails</>}
                        {tab === 'calls' && <><PhoneCall className="w-3.5 h-3.5 mr-2" /> Κλήσεις</>}
                        {tab === 'timeline' && <><Activity className="w-3.5 h-3.5 mr-2" /> Timeline</>}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="info" className="py-8 space-y-8 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <DetailItem label="ΑΦΜ / ΔΟΥ" value={`${selectedCustomer.tax_id || '—'} / ${selectedCustomer.tax_office || '—'}`} />
                        <DetailItem label="Τηλέφωνο" value={selectedCustomer.phone || '—'} />
                        <DetailItem label="Email" value={selectedCustomer.email || '—'} />
                        <DetailItem label="Διεύθυνση" value={`${selectedCustomer.address || '—'}, ${selectedCustomer.city || ''}`} />
                      </div>
                      <div className="space-y-6 text-right">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">Τρέχον Υπόλοιπο</span>
                          <span className={cn("text-4xl font-black tracking-tighter italic", selectedCustomer.balance > 0 ? "text-red-600" : "text-emerald-600")}>
                            €{(selectedCustomer.balance || 0).toLocaleString('el-GR')}
                          </span>
                        </div>
                        <DetailItem label="Πιστωτικό Όριο" value={`€${(selectedCustomer.credit_limit || 0).toLocaleString('el-GR')}`} align="right" />
                      </div>
                    </div>

                    {/* AI Strategic Insights */}
                    <div className="p-6 rounded-[2rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group border border-slate-800">
                      <Sparkles className="absolute top-0 right-0 w-32 h-32 text-white/5 -mr-8 -mt-8 rotate-12 group-hover:rotate-0 transition-all duration-700" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-xl">
                                <Bot className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] italic text-blue-200/70">Nexus Strategic AI</span>
                          </div>
                          <Button variant="secondary" size="xs" className="h-8 text-[10px] font-black bg-white/10 hover:bg-white/20 border-none text-white rounded-xl px-4" onClick={generateAISummary} disabled={aiLoading}>
                            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2 text-amber-400" />}
                            GENERATE INSIGHT
                          </Button>
                        </div>
                        {aiSummary ? (
                          <div className="flex gap-4">
                             <QuoteIcon className="w-6 h-6 text-slate-700 shrink-0" />
                             <p className="text-sm font-medium italic text-slate-200 leading-relaxed">"{aiSummary}"</p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 font-medium">Ενεργοποιήστε την AI ανάλυση για στρατηγική σύνοψη της καρτέλας.</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* --- VOIP CALL HISTORY TAB --- */}
                  <TabsContent value="calls" className="py-6 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-4">
                       <div className="flex items-center justify-between px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Ιστορικό Κλήσεων VoIP (3CX)</h4>
                          <Badge variant="outline" className="text-[9px] font-black border-slate-200">Local AI Enabled</Badge>
                       </div>
                       
                       <ScrollArea className="h-[400px]">
                          {callLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                               <div className="p-4 bg-white rounded-full shadow-sm mb-4"><Headphones className="w-6 h-6 text-slate-300" /></div>
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Δεν βρέθηκαν κλήσεις</p>
                               <p className="text-[10px] text-slate-400 mt-1">Η σύνδεση με το 3CX είναι ενεργή.</p>
                            </div>
                          ) : (
                            <div className="space-y-3 pr-4">
                               {callLogs.map((call) => (
                                 <Card key={call.id} className="rounded-2xl border-slate-100 hover:shadow-md transition-all group overflow-hidden">
                                    <div className="p-4 flex items-center gap-4">
                                       <div className={cn("p-3 rounded-xl", call.type === 'in' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
                                          <PhoneCall className="w-4 h-4" />
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                             <span className="text-xs font-black uppercase tracking-tighter italic">{new Date(call.created_date).toLocaleString('el-GR')}</span>
                                             <Badge className={cn("text-[8px] font-black px-1.5 h-4", 
                                                call.sentiment === 'positive' ? "bg-emerald-500" : 
                                                call.sentiment === 'angry' ? "bg-red-500" : "bg-slate-400")}>
                                                {call.sentiment || 'NEUTRAL'}
                                             </Badge>
                                          </div>
                                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{call.duration}s • {call.extension || 'Ext 101'}</p>
                                       </div>
                                       <div className="flex gap-2">
                                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-50 hover:bg-slate-900 hover:text-white group-hover:scale-110 transition-all">
                                             <Play className="w-4 h-4" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-50 hover:bg-blue-600 hover:text-white">
                                             <BrainCircuit className="w-4 h-4" />
                                          </Button>
                                       </div>
                                    </div>
                                    
                                    {/* AI Insight Expanded Section (Optional) */}
                                    <div className="px-4 pb-4 pt-0">
                                       <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                                          <div className="flex items-center gap-2 mb-2 text-primary">
                                             <Sparkles className="w-3 h-3" />
                                             <span className="text-[9px] font-black uppercase">Local AI Psychography</span>
                                          </div>
                                          <p className="text-[11px] leading-relaxed italic text-slate-600 line-clamp-2">"{call.ai_summary || 'Η απομαγνητοφώνηση είναι σε επεξεργασία από το τοπικό Whisper μοντέλο...'}"</p>
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
            <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[3rem] text-slate-300 bg-slate-50/50">
              <div className="p-8 rounded-full bg-white shadow-xl mb-6 ring-8 ring-slate-100/50"><User className="w-12 h-12 opacity-20" /></div>
              <p className="text-sm font-black tracking-widest uppercase italic text-slate-400">Επιλογή Καρτέλας Πελάτη</p>
              <p className="text-[10px] font-medium opacity-60 mt-2 max-w-[200px] text-center uppercase tracking-tighter">Δείτε ιστορικό κλήσεων, emails και AI αναλύσεις σε ένα περιβάλλον.</p>
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
        <DialogContent className="rounded-[2rem] border-none shadow-2xl">
          <DialogHeader><DialogTitle className="font-black italic uppercase tracking-tighter text-3xl">Nexus Data Import</DialogTitle></DialogHeader>
          <div className="py-8 space-y-4">
             <div className="p-6 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-tighter">Επιλέξτε αρχείο .CSV ή .TXT</p>
                <Input type="file" accept=".csv,.txt" onChange={handleFileImport} disabled={importing} className="rounded-xl border-slate-200 bg-white" />
             </div>
          </div>
          <DialogFooter><Button variant="ghost" className="rounded-xl font-bold" onClick={() => setImportDialogOpen(false)}>Ακύρωση</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function DetailItem({ label, value, align = "left" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <span className="text-slate-400 block text-[10px] uppercase font-black tracking-[0.2em] mb-1 italic">{label}</span>
      <span className="text-sm font-black text-slate-900 italic tracking-tight">{value}</span>
    </div>
  );
}

function QuoteIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L14.017 3C14.017 1.89543 14.9124 1 16.017 1L19.017 1C21.2261 1 23.017 2.79086 23.017 5V15C23.017 18.3137 20.3307 21 17.017 21H14.017ZM1 21L1 18C1 16.8954 1.89543 16 3 16H6C6.55228 16 7 15.5523 7 15V9C7 8.44772 6.55228 8 6 8H3C1.89543 8 1 7.10457 1 6V3L1 3C1 1.89543 1.89543 1 3 1H6C8.20914 1 10 2.79086 10 5V15C10 18.3137 7.31371 21 4 21H1Z" />
    </svg>
  );
}