import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SendEmailDialog({ open, onClose, customer }) {
  const [form, setForm] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);

  // Pre-fill when customer changes
  React.useEffect(() => {
    if (open && customer) {
      setForm({ to: customer.email || '', subject: '', body: '' });
    }
  }, [open, customer]);

  const handleSend = async () => {
    if (!form.to || !form.subject || !form.body) {
      toast.error('Συμπλήρωσε όλα τα υποχρεωτικά πεδία');
      return;
    }
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendEmail', {
        to: form.to,
        subject: form.subject,
        body: form.body,
        customer_id: customer?.id || null,
        customer_name: customer?.name || '',
      });

      if (res.data?.error) throw new Error(res.data.error);

      toast.success('Email εστάλη επιτυχώς!');
      onClose();
    } catch (e) {
      toast.error('Σφάλμα αποστολής: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-black text-xl flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Νέο Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-slate-500">Προς</Label>
            <Input
              value={form.to}
              onChange={(e) => setForm(f => ({ ...f, to: e.target.value }))}
              placeholder="email@example.com"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-slate-500">Θέμα</Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Θέμα email..."
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-slate-500">Κείμενο</Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Γράψε το μήνυμά σου..."
              className="rounded-xl min-h-[160px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Ακύρωση</Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2 rounded-xl font-bold">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Αποστολή
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
