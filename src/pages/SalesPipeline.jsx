import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Send, CheckCircle2, Clock, UserPlus, 
  Search, Mail, Phone, FileCheck, X, Loader2, TrendingUp, Euro 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STAGES = [
  { id: 'lead', label: 'Νέο Lead', color: 'bg-slate-100 text-slate-600', icon: UserPlus },
  { id: 'proposal', label: 'Προσφορά', color: 'bg-blue-100 text-blue-700', icon: FileText },
  { id: 'negotiation', label: 'Διαπραγμάτευση', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { id: 'won', label: 'Κλεισμένη Πώληση', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
];

export default function SalesPipeline() {
  const [deals, setDeals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null); 
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  useEffect(() => {
    if (customers.length > 0 && deals.length === 0) {
      setDeals(customers.map(c => ({ ...c, stage: c.stage || 'lead' })));
    }
  }, [customers]);

  const filteredDeals = deals.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tax_id?.includes(searchTerm) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.includes(searchTerm)
  );

  // Υπολογισμός Συνόλων ανά Στάδιο
  const getStageTotal = (stageId) => {
    return deals
      .filter(d => d.stage === stageId)
      .reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
  };

  const openActionModal = (deal, type) => {
    setActiveAction({ deal, type });
    setEmailBody(type === 'PROPOSAL' 
      ? `Αγαπητέ συνεργάτη,\n\nΣας αποστέλλουμε την οικονομική προσφορά για το Nexus ERP όπως συζητήσαμε.\n\nΜε εκτίμηση.` 
      : `Αγαπητέ συνεργάτη,\n\nΑκολουθεί το τιμολόγιο για την παραγγελία σας.\n\nΕυχαριστούμε για τη συνεργασία.`
    );
    setIsModalOpen(true);
  };

  // ΠΡΑΓΜΑΤΙΚΗ ΑΠΟΣΤΟΛΗ ΜΕΣΩ GMAIL
  const handleConfirmSend = async () => {
    if (!activeAction?.deal.email) {
      toast.error("Ο πελάτης δεν έχει email!");
      return;
    }

    setIsSending(true);
    try {
      // Direct κλήση της function αποστολής του Gmail
      await base44.functions.invoke('gmailSend', {
        to: activeAction.deal.email,
        subject: activeAction.type === 'PROPOSAL' ? 'Προσφορά Nexus ERP' : 'Τιμολόγιο Nexus ERP',
        body: emailBody
      });

      // Μετακίνηση σταδίου μόνο μετά την επιτυχή αποστολή
      let nextStage = activeAction.type === 'PROPOSAL' ? 'proposal' : 'won';
      setDeals(prev => prev.map(d => 
        d.id === activeAction.deal.id ? { ...d, stage: nextStage } : d
      ));

      toast.success(`Το email στάλθηκε επιτυχώς στον ${activeAction.deal.name}!`);
    } catch (error) {
      console.error(error);
      toast.error("Αποτυχία αποστολής. Ελέγξτε τις ρυθμίσεις Gmail.");
    } finally {
      setIsSending(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      <PageHeader title="Sales Pipeline" subtitle="Διαδραστική ροή πωλήσεων" />

      {/* Revenue Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAGES.map(stage => (
          <Card key={stage.id} className="bg-white/50 border-slate-100 shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stage.label}</p>
                <p className="text-lg font-black text-slate-800">€{getStageTotal(stage.id).toLocaleString('el-GR')}</p>
              </div>
              <Euro className="w-8 h-8 text-slate-100" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Αναζήτηση (ΑΦΜ, Όνομα, Τηλέφωνο...)" 
          className="pl-10 h-12 bg-white border-slate-200 shadow-sm rounded-2xl focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-380px)]">
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex flex-col bg-slate-50/60 rounded-[32px] border border-slate-200/60 p-4">
            <div className="flex items-center justify-between mb-6 px-2 pt-2">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl shadow-sm", stage.color)}>
                  <stage.icon size={18} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800">{stage.label}</h3>
              </div>
              <Badge className="bg-white text-slate-400 border-none shadow-none">{filteredDeals.filter(d => d.stage === stage.id).length}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              <AnimatePresence mode='popLayout'>
                {filteredDeals.filter(d => d.stage === stage.id).map((deal) => (
                  <motion.div key={deal.id} layoutId={deal.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <Card className="shadow-sm border-slate-200/80 hover:border-blue-500 hover:shadow-xl transition-all bg-white rounded-2xl group overflow-hidden">
                      <CardContent className="p-5">
                        <p className="font-bold text-slate-900 text-sm truncate">{deal.name}</p>
                        <div className="space-y-1.5 mb-5 mt-2">
                          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">ΑΦΜ: {deal.tax_id || '—'}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                            <Mail size={12} className="text-slate-300" /> {deal.email || '—'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                            <Phone size={12} className="text-slate-300" /> {deal.phone || '—'}
                          </div>
                        </div>
                        <div className="space-y-2 pt-3 border-t border-slate-50">
                          {stage.id === 'lead' && (
                            <Button onClick={() => openActionModal(deal, 'PROPOSAL')} className="w-full h-9 text-[10px] font-black gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-blue-100 shadow-lg">
                              <Send size={12} /> ΣΤΕΙΛΕ ΠΡΟΣΦΟΡΑ
                            </Button>
                          )}
                          {stage.id === 'proposal' && (
                            <Button onClick={() => openActionModal(deal, 'INVOICE')} className="w-full h-9 text-[10px] font-black gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-emerald-100 shadow-lg">
                              <FileCheck size={12} /> ΣΤΕΙΛΕ ΤΙΜΟΛΟΓΙΟ
                            </Button>
                          )}
                          {stage.id === 'won' && (
                            <div className="flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                              <CheckCircle2 size={12} /> Ολοκληρώθηκε
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[40px] p-10 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Επιβεβαίωση Αποστολής</DialogTitle>
            <DialogDescription className="font-medium text-slate-500 pt-2">
              Πρόκειται να στείλετε {activeAction?.type === 'PROPOSAL' ? 'Προσφορά' : 'Τιμολόγιο'} στον πελάτη <strong>{activeAction?.deal.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Παραλήπτη</p>
               <p className="font-bold text-slate-700">{activeAction?.deal.email}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Περιεχόμενο Email</label>
              <Textarea 
                className="rounded-2xl border-slate-200 min-h-[140px] p-4 text-sm leading-relaxed"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold text-slate-400">Άκυρο</Button>
            <Button 
              disabled={isSending} 
              onClick={handleConfirmSend} 
              className={cn("rounded-2xl px-10 h-12 font-black uppercase tracking-widest transition-all", activeAction?.type === 'PROPOSAL' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-xl" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 shadow-xl")}
            >
              {isSending ? <Loader2 size={18} className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
              {isSending ? 'Αποστολή...' : 'Επιβεβαίωση'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
