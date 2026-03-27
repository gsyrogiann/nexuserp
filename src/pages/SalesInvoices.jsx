import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import DocumentFormDialog from '../components/shared/DocumentFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { 
  FileText, CreditCard, AlertTriangle, Search, 
  TrendingUp, Wallet, Receipt, Bot, Sparkles, Loader2 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Ορισμός Στηλών με Χρωματική Σήμανση Κατάστασης
const columns = [
  { key: 'number', label: 'Παραστατικό #', className: "font-mono font-bold text-blue-600" },
  { key: 'customer_name', label: 'Πελάτης', className: "font-medium" },
  { key: 'date', label: 'Ημερομηνία', type: 'date' },
  { key: 'total', label: 'Σύνολο', type: 'currency', className: "font-black" },
  { 
    key: 'status', 
    label: 'Κατάσταση', 
    type: 'status',
    render: (val) => {
      const colors = {
        paid: "bg-emerald-500 text-white",
        unpaid: "bg-amber-500 text-white",
        overdue: "bg-red-500 text-white",
        draft: "bg-slate-400 text-white"
      };
      return (
        <span className={cn("px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter", colors[val] || colors.draft)}>
          {val}
        </span>
      );
    }
  },
];

function getNextInvoiceNumber(invoices = []) {
  const numericValues = invoices
    .map((invoice) => String(invoice.number || '').trim())
    .map((number) => {
      const match = number.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((value) => Number.isInteger(value));

  const maxNumber = numericValues.length > 0 ? Math.max(...numericValues) : 0;
  return String(maxNumber + 1).padStart(3, '0');
}

export default function SalesInvoices() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const qc = useQueryClient();

  // Φόρτωση Δεδομένων (PAGINATION FIX)
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['salesInvoices'],
    queryFn: () => fetchList(base44.entities.SalesInvoice),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchList(base44.entities.Customer),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchList(base44.entities.Product),
  });

  const nextInvoiceNumber = useMemo(() => {
    return getNextInvoiceNumber(invoices);
  }, [invoices]);

  // SMART FILTER
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SalesInvoice.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salesInvoices'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SalesInvoice.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salesInvoices'] }),
  });

  const handleSubmit = async (data) => {
    const payload = {
      ...data,
      customer_id: data.customer_id || data.customer_name || 'manual_entry',
    };

    if (editing?.id) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createMutation.mutateAsync({
        ...payload,
        number: data.number || nextInvoiceNumber,
        status: 'unpaid',
        paid_amount: 0,
      });
    }

    setEditing(null);
    setDialogOpen(false);
  };

  // Οικονομικά Στοιχεία
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const outstanding = totalInvoiced - totalPaid;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  // AI Financial Analysis
  const analyzeFinance = async () => {
    setAiLoading(true);
    try {
      const prompt = `Ανάλυσε τα οικονομικά στοιχεία του Nexus ERP: 
      Συνολικά Τιμολογημένα: €${totalInvoiced}. 
      Εισπράξεις: €${totalPaid}. 
      Ανεξόφλητα: €${outstanding}. 
      Ληξιπρόθεσμα: ${overdueCount}. 
      Δώσε μια συμβουλή στρατηγικής για το Cash Flow σε 2 προτάσεις.`;
      
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setAiAnalysis(result);
    } catch (e) {
      setAiAnalysis("Αδυναμία ανάλυσης δεδομένων.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <PageHeader
        title="Τιμολόγια Πωλήσεων"
        subtitle={`${invoices.length} συνολικά παραστατικά`}
        actionLabel="Νέο Τιμολόγιο"
        onAction={() => {
          setEditing({
            number: nextInvoiceNumber,
            date: new Date().toISOString().split('T')[0],
            notes: '',
            customer_id: '',
            items: [],
          });
          setDialogOpen(true);
        }}
      />

      {/* Finance Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Τιμολογημένα" value={`€${totalInvoiced.toLocaleString('el-GR')}`} icon={Receipt} />
        <StatsCard label="Εισπράξεις" value={`€${totalPaid.toLocaleString('el-GR')}`} icon={Wallet} />
        <StatsCard label="Ανεξόφλητα" value={`€${outstanding.toLocaleString('el-GR')}`} icon={AlertTriangle} />
        <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group">
          <Sparkles className="absolute top-0 right-0 w-24 h-24 text-white/5 -mr-4 -mt-4" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">AI Cashflow Advisor</span>
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            {aiAnalysis ? (
              <p className="text-[11px] leading-relaxed italic text-blue-100 mb-2">"{aiAnalysis}"</p>
            ) : (
              <div className="text-2xl font-black">{overdueCount} <span className="text-xs font-normal text-slate-400 uppercase">Overdue</span></div>
            )}
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={analyzeFinance} 
              disabled={aiLoading}
              className="mt-2 h-7 bg-white/10 hover:bg-white/20 border-none text-white text-[10px] font-bold rounded-lg"
            >
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <TrendingUp className="w-3 h-3 mr-2 text-blue-400" />}
              {aiAnalysis ? "ΕΠΑΝΑΛΗΨΗ ΑΝΑΛΥΣΗΣ" : "ΑΝΑΛΥΣΗ ΤΩΡΑ"}
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Αναζήτηση με Αρ. Παραστατικού ή Όνομα Πελάτη..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-blue-600 rounded-xl h-11"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredInvoices}
        loading={isLoading}
        onRowClick={(row) => {
          setEditing(row);
          setDialogOpen(true);
        }}
      />

      {/* DOCUMENT FORM - Εδώ γίνεται η αυτόματη εφαρμογή των Tiers */}
      <DocumentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing?.id ? 'Επεξεργασία Τιμολογίου' : 'Έκδοση Νέου Τιμολογίου'}
        initialData={editing}
        onSubmit={handleSubmit}
        customers={customers}
        products={products} // Τα προϊόντα περιλαμβάνουν τα price_tiers
        entityType="customer"
      />
    </div>
  );
}
