import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2 } from 'lucide-react';

export default function DocumentFormDialog({
  open,
  onOpenChange,
  title,
  initialData,
  onSubmit,
  customers,
  suppliers,
  products,
  entityType = 'customer',
}) {
  const [form, setForm] = useState({});
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initialData || {
          date: new Date().toISOString().split('T')[0],
        }
      );
      setItems(initialData?.items || []);
    }
  }, [open, initialData]);

  const entities = entityType === 'customer' ? (customers || []) : (suppliers || []);
  const entityIdKey = entityType === 'customer' ? 'customer_id' : 'supplier_id';

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: '',
        product_name: '',
        sku: '',
        quantity: 1,
        unit_price: 0,
        vat_rate: 24,
        discount_pct: 0,
        line_total: 0,
      },
    ]);
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[idx] = { ...newItems[idx], [field]: value };

      if (field === 'product_id') {
        const prod = (products || []).find((p) => p.id === value);
        if (prod) {
          newItems[idx].product_name = prod.name;
          newItems[idx].sku = prod.sku;
          newItems[idx].unit_price =
            entityType === 'customer' ? (prod.sell_price || 0) : (prod.buy_price || 0);
          newItems[idx].vat_rate = prod.vat_rate || 24;
        }
      }

      const qty = Number(newItems[idx].quantity) || 0;
      const price = Number(newItems[idx].unit_price) || 0;
      const disc = Number(newItems[idx].discount_pct) || 0;

      newItems[idx].line_total = qty * price * (1 - disc / 100);

      return newItems;
    });
  };

  const subtotal = items.reduce((s, i) => s + (i.line_total || 0), 0);
  const vatTotal = items.reduce(
    (s, i) => s + (i.line_total || 0) * ((i.vat_rate || 0) / 100),
    0
  );
  const total = subtotal + vatTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const entityNameKey = entityType === 'customer' ? 'customer_name' : 'supplier_name';
      const entity = entities.find((entry) => entry.id === form[entityIdKey]);

      await onSubmit({
        ...form,
        [entityNameKey]: entity?.name || '',
        items,
        subtotal,
        vat_total: vatTotal,
        total,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Number</Label>
              <Input
                value={form.number || ''}
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                required
                placeholder="e.g. INV-001"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{entityType === 'customer' ? 'Customer' : 'Supplier'}</Label>
              <Select
                value={form[entityIdKey] || ''}
                onValueChange={(v) => setForm((f) => ({ ...f, [entityIdKey]: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date || ''}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={form.notes || ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <div className="min-w-[980px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs min-w-[360px]">Product</TableHead>
                      <TableHead className="text-xs min-w-[110px]">Qty</TableHead>
                      <TableHead className="text-xs min-w-[130px]">Price</TableHead>
                      <TableHead className="text-xs min-w-[110px]">Disc %</TableHead>
                      <TableHead className="text-xs min-w-[90px]">VAT %</TableHead>
                      <TableHead className="text-xs min-w-[130px]">Total</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="align-top">
                          <Select
                            value={item.product_id || ''}
                            onValueChange={(v) => updateItem(idx, 'product_id', v)}
                          >
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {(products || []).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.sku} — {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell className="align-top">
                          <Input
                            type="number"
                            className="h-10 text-sm min-w-[90px]"
                            value={item.quantity ?? 0}
                            onChange={(e) =>
                              updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)
                            }
                          />
                        </TableCell>

                        <TableCell className="align-top">
                          <Input
                            type="number"
                            className="h-10 text-sm min-w-[110px]"
                            value={item.unit_price ?? 0}
                            onChange={(e) =>
                              updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)
                            }
                          />
                        </TableCell>

                        <TableCell className="align-top">
                          <Input
                            type="number"
                            className="h-10 text-sm min-w-[90px]"
                            value={item.discount_pct ?? 0}
                            onChange={(e) =>
                              updateItem(idx, 'discount_pct', parseFloat(e.target.value) || 0)
                            }
                          />
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="h-10 flex items-center text-sm font-medium">
                            {item.vat_rate || 0}%
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="h-10 flex items-center text-sm font-semibold">
                            €{(item.line_total || 0).toFixed(2)}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => removeItem(idx)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                          No items added
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-xs text-right space-y-1 text-sm">
                <div className="flex justify-between gap-8">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-muted-foreground">VAT:</span>
                  <span>€{vatTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-8 font-bold text-base border-t pt-2">
                  <span>Total:</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialData?.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
