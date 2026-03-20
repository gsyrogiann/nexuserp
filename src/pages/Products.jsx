import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import PriceTiersEditor from '../components/products/PriceTiersEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Layers } from 'lucide-react';

const UNIT_OPTIONS = ['piece', 'kg', 'liter', 'meter', 'box', 'pallet'];
const VAT_OPTIONS = ['0', '6', '13', '24'];
const STATUS_OPTIONS = ['active', 'inactive', 'discontinued'];

const columns = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Product Name' },
  { key: 'category', label: 'Category', type: 'badge' },
  { key: 'buy_price', label: 'Buy Price', type: 'currency' },
  { key: 'sell_price', label: 'Sell Price', type: 'currency' },
  { key: 'vat_rate', label: 'VAT %', type: 'number' },
  { key: 'unit', label: 'Unit' },
  {
    key: 'enable_price_tiers',
    label: 'Price Tiers',
    render: (val, row) =>
      val ? (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[11px]">
          <Layers className="w-3 h-3" />
          {(row.price_tiers || []).length} tiers
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  { key: 'status', label: 'Status', type: 'status' },
];

const emptyForm = {
  sku: '', name: '', description: '', category: '', unit: 'piece',
  buy_price: '', sell_price: '', vat_rate: '24', barcode: '',
  min_stock: '', supplier_name: '', status: 'active', enable_price_tiers: false, price_tiers: [],
};

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const qc = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const openNew = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (row) => {
    setForm({ ...emptyForm, ...row, vat_rate: String(row.vat_rate ?? '24'), price_tiers: row.price_tiers || [], enable_price_tiers: row.enable_price_tiers ?? false });
    setDialogOpen(true);
  };

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      vat_rate: Number(form.vat_rate),
      buy_price: form.buy_price !== '' ? Number(form.buy_price) : 0,
      sell_price: form.sell_price !== '' ? Number(form.sell_price) : 0,
      min_stock: form.min_stock !== '' ? Number(form.min_stock) : 0,
    };
    if (form.id) await updateMutation.mutateAsync({ id: form.id, data });
    else await createMutation.mutateAsync(data);
    setDialogOpen(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle={`${products.length} products in catalog`}
        actionLabel="New Product"
        onAction={openNew}
      />
      <DataTable columns={columns} data={products} onRowClick={openEdit} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>SKU Code *</Label>
                <Input value={form.sku} onChange={e => set('sku', e.target.value)} required placeholder="e.g. PRD-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Product Name *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={form.category} onChange={e => set('category', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => set('unit', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Buy Price (€)</Label>
                <Input type="number" min="0" step="0.01" value={form.buy_price} onChange={e => set('buy_price', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Sell Price (€)</Label>
                <Input type="number" min="0" step="0.01" value={form.sell_price} onChange={e => set('sell_price', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>VAT Rate</Label>
                <Select value={String(form.vat_rate)} onValueChange={v => set('vat_rate', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VAT_OPTIONS.map(v => <SelectItem key={v} value={v}>{v}%</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Barcode</Label>
                <Input value={form.barcode} onChange={e => set('barcode', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Min Stock</Label>
                <Input type="number" min="0" value={form.min_stock} onChange={e => set('min_stock', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Primary Supplier</Label>
                <Input value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <PriceTiersEditor
                tiers={form.price_tiers}
                onChange={(tiers) => set('price_tiers', tiers)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Άκυρο</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Αποθήκευση...' : 'Αποθήκευση'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}