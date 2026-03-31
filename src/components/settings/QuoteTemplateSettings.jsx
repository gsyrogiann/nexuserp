import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save, Loader2, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_TEMPLATE = {
  company_name: '',
  company_address: '',
  company_phone: '',
  company_email: '',
  company_vat: '',
  header_note: 'Σας αποστέλλουμε την παρακάτω προσφορά μας.',
  footer_note: 'Η παρούσα προσφορά ισχύει για 30 ημέρες από την ημερομηνία έκδοσης.',
  payment_terms_note: 'Πληρωμή: 30 ημέρες από έκδοση τιμολογίου.',
  signature_name: '',
  signature_title: '',
};

async function loadTemplate() {
  const all = await base44.entities.AppSettings.list();
  const rec = all.find(s => s.key === 'quote_template');
  return rec ? JSON.parse(rec.telegram_bot_token || '{}') : DEFAULT_TEMPLATE;
}

async function saveTemplate(data) {
  const all = await base44.entities.AppSettings.list();
  const existing = all.find(s => s.key === 'quote_template');
  const payload = { key: 'quote_template', telegram_bot_token: JSON.stringify(data) };
  if (existing?.id) {
    await base44.entities.AppSettings.update(existing.id, payload);
  } else {
    await base44.entities.AppSettings.create(payload);
  }
}

export default function QuoteTemplateSettings() {
  const [form, setForm] = useState(DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    loadTemplate().then(data => setForm({ ...DEFAULT_TEMPLATE, ...data }));
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTemplate(form);
      toast.success('Template αποθηκεύτηκε!');
    } catch (e) {
      toast.error('Σφάλμα: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Στοιχεία Εταιρείας
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'company_name', label: 'Επωνυμία', placeholder: 'Εταιρεία Α.Ε.' },
            { key: 'company_vat', label: 'ΑΦΜ', placeholder: '123456789' },
            { key: 'company_address', label: 'Διεύθυνση', placeholder: 'Οδός 1, Πόλη' },
            { key: 'company_phone', label: 'Τηλέφωνο', placeholder: '210 0000000' },
            { key: 'company_email', label: 'Email', placeholder: 'info@company.gr' },
            { key: 'signature_name', label: 'Υπογραφή - Όνομα', placeholder: 'Γιώργης Παπαδόπουλος' },
            { key: 'signature_title', label: 'Υπογραφή - Τίτλος', placeholder: 'Διευθυντής Πωλήσεων' },
          ].map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">{field.label}</Label>
              <Input value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder} className="rounded-xl" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-black">Κείμενα Προσφοράς</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'header_note', label: 'Εισαγωγικό κείμενο (επάνω)' },
            { key: 'footer_note', label: 'Κείμενο λήξης (κάτω)' },
            { key: 'payment_terms_note', label: 'Όροι πληρωμής' },
          ].map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">{field.label}</Label>
              <Textarea value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)} className="rounded-xl min-h-[80px]" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Eye className="w-5 h-5 text-slate-400" /> Προεπισκόπηση
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setPreview(v => !v)}>{preview ? 'Απόκρυψη' : 'Εμφάνιση'}</Button>
        </CardHeader>
        {preview && (
          <CardContent>
            <div className="border border-slate-200 rounded-xl p-6 bg-white text-sm space-y-4 font-mono">
              <div className="flex justify-between border-b pb-4">
                <div>
                  <p className="font-bold text-lg">{form.company_name || 'Επωνυμία'}</p>
                  <p className="text-slate-500">{form.company_address}</p>
                  <p className="text-slate-500">{form.company_phone} · {form.company_email}</p>
                  <p className="text-slate-500">ΑΦΜ: {form.company_vat}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl text-primary">ΠΡΟΣΦΟΡΑ</p>
                  <p className="text-slate-500">Αρ.: PRO-2024-001</p>
                  <p className="text-slate-500">Ημ/νία: {new Date().toLocaleDateString('el-GR')}</p>
                </div>
              </div>
              <p className="text-slate-600 italic">{form.header_note}</p>
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">[Γραμμές προϊόντων...]</div>
              <p className="text-slate-600 italic">{form.footer_note}</p>
              <p className="text-slate-600">{form.payment_terms_note}</p>
              <div className="text-right border-t pt-4">
                <p className="font-bold">{form.signature_name}</p>
                <p className="text-slate-500">{form.signature_title}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-bold">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Αποθήκευση Template
      </Button>
    </div>
  );
}