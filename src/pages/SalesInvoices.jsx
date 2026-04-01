import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import { listCustomers } from '@/lib/directoryQueries';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import DocumentFormDialog from '../components/shared/DocumentFormDialog';
import StatsCard from '../components/shared/StatsCard';
import { 
  AlertTriangle, Search, 
  TrendingUp, Wallet, Receipt, Bot, Sparkles, Loader2 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { executeMutation } from '@/lib/mutationHelpers';

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

  // Queries
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['salesInvoices'], queryFn: () => fetchList(base44.entities.SalesInvoice) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => listCustomers() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => fetchList(base44.entities.Product) });

  const nextInvoiceNumber = useMemo(() => getNextInvoiceNumber(invoices), [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => executeMutation(
      () => base44.entities.SalesInvoice.create(data),
      {
        actionLabel: 'create sales invoice',
        fallbackMessage: 'Δεν ήταν δυνατή η δημιουργία του τιμολογίου.',
        audit: {
          action: 'create',
          target: 'sales_invoice',
          summary: 'Created sales invoice',
          metadata: {
            number: data?.number,
            customerId: data?.customer_id,
          },
        },
      }
    ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salesInvoices'] }),
    meta: {
      title: 'Αποτυχία δημιουργίας τιμολογίου',
      fallbackMessage: 'Δεν ήταν δυνατή η δημιουργία του τιμολογίου.',
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => executeMutation(
      () => base44.entities.SalesInvoice.update(id, data),
      {
        actionLabel: 'update sales invoice',
        fallbackMessage: 'Δεν ήταν δυνατή η ενημέρωση του τιμολογίου.',
        audit: {
          action: 'update',
          target: 'sales_invoice',
          targetId: id,
          summary: 'Updated sales invoice',
          metadata: {
            number: data?.number,
            customerId: data?.customer_id,
          },
        },
      }
    ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salesInvoices'] }),
    meta: {
      title: 'Αποτυχία ενημέρωσης τιμολογίου',
      fallbackMessage: 'Δεν ήταν δυνατή η ενημέρωση του τιμολογίου.',
    },
  });

  // --- AUTOMATED STOCK LOGIC ---
  const handleStockMovement = async (invoiceData) => {
    if (!invoiceData.items || invoiceData.items.length === 0) return;

    for (const item of invoiceData.items) {
      await base44.entities.StockMovement.create({
        product_id: item.product_id,
        product_name: item.name,
        type: 'out',
        quantity: item.quantity,
        reference_type: 'Sales Invoice',
        reference_id: invoiceData.number,
        warehouse_name: 'Main Warehouse', // Default αποθήκη
        created_date: new Date().toISOString()
      });
      
      // Update την ποσότητα στο Product Entity
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        const newQty = (Number(product.stock_quantity) || 0) - (Number(item.quantity) || 0);
        await executeMutation(
          () => base44.entities.Product.update(product.id, { stock_quantity: newQty }),
          {
            actionLabel: 'update product stock',
            fallbackMessage: `Αποτυχία ενημέρωσης αποθέματος για το προϊόν ${product.name || product.id}.`,
            audit: {
              action: 'update_stock',
              target: 'product',
              targetId: product.id,
              summary: 'Updated stock quantity after sales invoice',
              metadata: {
                invoiceNumber: invoiceData?.number,
                quantityDelta: -(Number(item.quantity) || 0),
                newStockQuantity: newQty,
              },
            },
          }
        );
      }
    }
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['stockMovements'] });
  };

  const handleSubmit = async (data) => {
    if (!data.customer_id && !data.customer_name) {
      throw new Error('Το τιμολόγιο χρειάζεται πελάτη πριν την αποθήκευση.');
    }

    const payload = {
      ...data,
      customer_id: data.customer_id || data.customer_name || 'manual_entry',
    };

    if (editing?.id) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
    } else {
      const newInvoice = await createMutation.mutateAsync({
        ...payload,
        number: data.number || nextInvoiceNumber,
        status: 'unpaid',
        paid_amount: 0,
      });
      
      // Αυτόματη ενημέρωση αποθήκης μόνο σε νέα τιμολόγια
      await handleStockMovement(data);
    }

    setEditing(null);
    setDialogOpen(false);
  };

  // Οικονομικά
  const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0);
  const outstanding = totalInvoiced - totalPaid;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  const analyzeFinance = async () => {
    setAiLoading(true);
    try {
      const prompt = `Ανάλυσε τα οικονομικά: Τιμολογημένα: €${totalInvoiced}, Εισπράξεις: €${totalPaid}, Ανεξόφλητα: €${outstanding}. Δώσε 2 προτάσεις για βελτίωση ρευστότητας.`;
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      const reply = result && typeof result === 'object' && 'reply' in result && typeof result.reply === 'string'
        ? result.reply
        : null;
      setAiAnalysis(typeof result === 'string' ? result : reply || 'Η ανάλυση ολοκληρώθηκε χωρίς κείμενο απάντησης.');
    } catch (e) {
      setAiAnalysis("Σφάλμα ανάλυσης.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <PageHeader
        title="Τιμολόγια Πωλήσεων"
        subtitle={`${invoices.length} παραστατικά`}
        actionLabel="Νέο Τιμολόγιο"
        onAction={() => {
          setEditing({
            number: nextInvoiceNumber,
            date: new Date().toISOString().split('T')[0],
            items: [],
          });
          setDialogOpen(true);
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Τιμολογημένα" value={`€${totalInvoiced.toLocaleString('el-GR')}`} icon={Receipt} />
        <StatsCard label="Εισπράξεις" value={`€${totalPaid.toLocaleString('el-GR')}`} icon={Wallet} />
        <StatsCard label="Ανεξόφλητα" value={`€${outstanding.toLocaleString('el-GR')}`} icon={AlertTriangle} />
        
        <div className="bg-slate-900 rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden group border border-slate-800">
          <Sparkles className="absolute top-0 right-0 w-24 h-24 text-white/5 -mr-4 -mt-4" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic font-mono">AI CFO Insights</span>
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            {aiAnalysis ? (
              <p className="text-[11px] leading-relaxed italic text-blue-100/90 font-medium">"{aiAnalysis}"</p>
            ) : (
              <div className="text-2xl font-black italic tracking-tighter">{overdueCount} <span className="text-xs font-normal text-slate-500 uppercase tracking-normal">Overdue</span></div>
            )}
            <Button 
              variant="ghost" 
              onClick={analyzeFinance} 
              disabled={aiLoading}
              className="mt-3 h-8 bg-blue-600/20 hover:bg-blue-600/40 text-blue-200 text-[10px] font-black rounded-xl border border-blue-500/20"
            >
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <TrendingUp className="w-3 h-3 mr-2" />}
              {aiAnalysis ? "ΑΝΑΝΕΩΣΗ" : "AI ANALYSIS"}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Αναζήτηση παραστατικού ή πελάτη..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 bg-slate-50/50 border-none rounded-2xl h-12 text-sm focus-visible:ring-2 focus-visible:ring-blue-600/20"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredInvoices}
        loading={isLoading}
        onRowClick={(row) => { setEditing(row); setDialogOpen(true); }}
      />

      <DocumentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing?.id ? 'Επεξεργασία' : 'Νέο Τιμολόγιο'}
        initialData={editing}
        onSubmit={handleSubmit}
        customers={customers}
        products={products}
        entityType="customer"
      />
    </div>
  );
}
