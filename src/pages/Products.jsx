import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import PriceTiersEditor from '../components/products/PriceTiersEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Layers, Search, TrendingUp, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    id: '',
    sku: '', name: '', description: '', category: '',
    unit: 'piece', buy_price: 0, sell_price: 0, vat_rate: 24,
    status: 'active', enable_price_tiers: false, price_tiers: [],
  });

  const qc = useQueryClient();

  // PAGINATION FIX: Χρήση fetchList για πλήρη πρόσβαση σε όλο τον κατάλογο
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchList(base44.entities.Product),
  });

  // SMART FILTER: Αναζήτηση σε SKU και Όνομα
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // COLUMNS DEFINITION
  const columns = [
    { key: 'sku', label: 'SKU', className: "font-mono font-bold text-blue-600" },
    { key: 'name', label: 'Προϊόν' },
    { key: 'category', label: 'Κατηγορία', type: 'badge' },
    { key: 'buy_price', label: 'Τιμή Αγοράς', type: 'currency' },
    { key: 'sell_price', label: 'Τιμή Πώλησης', type: 'currency' },
    { 
      key: 'margin', 
      label: 'Margin %',
      render: (_, row) => {
        const sellPrice = Number(row.sell_price || 0);
        const buyPrice = Number(row.buy_price || 0);
        const marginValue = sellPrice > 0 ? ((sellPrice - buyPrice) / sellPrice * 100) : 0;
        const margin = marginValue.toFixed(1);
        return (
          <span className={cn("font-bold", marginValue > 20 ? "text-emerald-600" : "text-amber-600")}>
            {margin}%
          </span>
        );
      }
    },
    {
      key: 'enable_price_tiers',
      label: 'Κλιμακώσεις',
      render: (val, row) =>
        val ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[10px] font-black uppercase">
            <Layers className="w-3 h-3" />
            {(row.price_tiers || []).length} Tiers
          </Badge>
        ) : (
          <span className="text-muted-foreground text-[10px] opacity-40 italic">Single Price</span>
        ),
    },
    { key: 'status', label: 'Status', type: 'status' },
  ];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const openNew = () => {
    setForm({
      id: '',
      sku: '', name: '', description: '', category: '',
      unit: 'piece', buy_price: 0, sell_price: 0, vat_rate: 24,
      status: 'active', enable_price_tiers: false, price_tiers: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      ...row,
      price_tiers: Array.isArray(row.price_tiers) ? row.price_tiers : [],
      enable_price_tiers: !!row.enable_price_tiers,
    });
    setDialogOpen(true);
  };

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      buy_price: Number(form.buy_price || 0),
      sell_price: Number(form.sell_price || 0),
      vat_rate: Number(form.vat_rate || 24),
    };

    if (form.id) {
      await updateMutation.mutateAsync({ id: form.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  // Live Margin Calculation for the form
  const currentMargin = useMemo(() => {
    const sellPrice = Number(form.sell_price || 0);
    const buyPrice = Number(form.buy_price || 0);
    if (!sellPrice || sellPrice <= 0) return 0;
    return (((sellPrice - buyPrice) / sellPrice) * 100).toFixed(1);
  }, [form.buy_price, form.sell_price]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Κατάλογος Προϊόντων"
        subtitle={`${products.length} συνολικοί κωδικοί`}
        actionLabel="Νέο Προϊόν"
        onAction={openNew}
      />

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Αναζήτηση με SKU ή Όνομα..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-xl"
          />
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredProducts} 
        onRowClick={openEdit} 
        loading={isLoading}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">
                {form.id ? 'Επεξεργασία Προϊόντος' : 'Νέα Καταχώρηση'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Κωδικός (SKU)</Label>
                <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} required className="rounded-xl border-slate-200" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ονομασία</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} required className="rounded-xl border-slate-200" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Περιγραφή</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="rounded-xl border-slate-200 min-h-[80px]" />
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 opacity-5">
                  <TrendingUp className="w-12 h-12" />
               </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Αγορά (€)</Label>
                <Input type="number" step="0.01" value={form.buy_price} onChange={(e) => set('buy_price', e.target.value)} className="rounded-lg bg-white" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Πώληση (€)</Label>
                <Input type="number" step="0.01" value={form.sell_price} onChange={(e) => set('sell_price', e.target.value)} className="rounded-lg bg-white" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Margin (%)</Label>
                <div className={cn(
                  "h-10 flex items-center px-3 rounded-lg font-black text-sm border",
                  Number(currentMargin) > 20 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                )}>
                  {currentMargin}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.enable_price_tiers}
                  onCheckedChange={(v) => set('enable_price_tiers', v)}
                />
                <div>
                  <Label className="font-bold text-blue-900">Ενεργοποίηση Κλιμακώσεων</Label>
                  <p className="text-[10px] text-blue-600 font-medium">Αυτόματη τιμολόγηση βάσει ποσότητας</p>
                </div>
              </div>
              <Layers className={cn("w-5 h-5 transition-colors", form.enable_price_tiers ? "text-blue-500" : "text-slate-300")} />
            </div>

            {form.enable_price_tiers && (
              <div className="animate-in fade-in slide-in-from-top-4">
                <PriceTiersEditor
                  tiers={form.price_tiers}
                  onChange={(tiers) => set('price_tiers', tiers)}
                />
              </div>
            )}

            <div className="p-4 border-t flex justify-end gap-3 pt-6">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold">
                Ακύρωση
              </Button>
              <Button type="submit" className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 px-8 shadow-lg shadow-blue-200">
                {form.id ? 'Ενημέρωση' : 'Αποθήκευση'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
