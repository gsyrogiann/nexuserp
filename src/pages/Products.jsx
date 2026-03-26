import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';
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

const columns = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Product Name' },
  { key: 'category', label: 'Category', type: 'badge' },
  { key: 'buy_price', label: 'Buy Price', type: 'currency' },
  { key: 'sell_price', label: 'Sell Price', type: 'currency' },
  { key: 'vat_rate', label: 'VAT %', type: 'number' },
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
  sku: '',
  name: '',
  description: '',
  category: '',
  unit: 'piece',
  buy_price: 0,
  sell_price: 0,
  vat_rate: 24,
  status: 'active',
  enable_price_tiers: false,
  price_tiers: [],
};

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchList(base44.entities.Product),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const openNew = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      ...emptyForm,
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
      price_tiers: Array.isArray(form.price_tiers) ? form.price_tiers : [],
    };

    if (form.id) {
      await updateMutation.mutateAsync({ id: form.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }

    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle={`${products.length} products`}
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
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} required />
              </div>

              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Buy Price</Label>
                <Input type="number" value={form.buy_price} onChange={(e) => set('buy_price', e.target.value)} />
              </div>

              <div>
                <Label>Sell Price</Label>
                <Input type="number" value={form.sell_price} onChange={(e) => set('sell_price', e.target.value)} />
              </div>

              <div>
                <Label>VAT</Label>
                <Input type="number" value={form.vat_rate} onChange={(e) => set('vat_rate', e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.enable_price_tiers}
                onCheckedChange={(v) => set('enable_price_tiers', v)}
              />
              <Label>Enable Price Tiers</Label>
            </div>

            {form.enable_price_tiers && (
              <PriceTiersEditor
                tiers={form.price_tiers}
                onChange={(tiers) => set('price_tiers', tiers)}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
