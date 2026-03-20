import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

export default function PriceTiersEditor({ tiers = [], onChange }) {
  const addTier = () => {
    const lastMinQty = tiers.length > 0 ? tiers[tiers.length - 1].min_qty : 0;
    onChange([...tiers, { min_qty: lastMinQty + 1, price: 0 }]);
  };

  const removeTier = (index) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index, field, value) => {
    const updated = tiers.map((t, i) =>
      i === index ? { ...t, [field]: Number(value) } : t
    );
    onChange(updated);
  };

  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Κλιμάκωση Τιμών</span>
        <Button type="button" variant="outline" size="sm" onClick={addTier} className="gap-1 h-7 text-xs">
          <Plus className="w-3 h-3" /> Προσθήκη
        </Button>
      </div>

      {tiers.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-1">Δεν υπάρχει κλιμάκωση. Χρησιμοποιείται η βασική τιμή πώλησης.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Από Ποσότητα</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Τιμή/Μον. (€)</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Εύρος</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tier, i) => {
                const nextMinQty = sorted[i + 1]?.min_qty;
                const rangeLabel = nextMinQty
                  ? `${tier.min_qty} – ${nextMinQty - 1} τεμ.`
                  : `${tier.min_qty}+ τεμ.`;
                const originalIndex = tiers.indexOf(tier);
                return (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        min="1"
                        value={tier.min_qty}
                        onChange={(e) => updateTier(originalIndex, 'min_qty', e.target.value)}
                        className="h-7 w-24 text-sm"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price}
                        onChange={(e) => updateTier(originalIndex, 'price', e.target.value)}
                        className="h-7 w-28 text-sm"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{rangeLabel}</td>
                    <td className="px-2 py-1.5">
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeTier(originalIndex)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}