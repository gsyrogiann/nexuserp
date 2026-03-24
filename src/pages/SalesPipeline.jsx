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
  Search, Mail, Phone, FileCheck, X, Loader2, TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { id: 'lead', label: 'Νέο Lead', color: 'bg-slate-100 text-slate-600', icon: UserPlus },
  { id: 'proposal', label: 'Προσφορά', color: 'bg-blue-100 text-blue-700', icon: FileText },
  { id: 'negotiation', label: 'Διαπραγμάτευση', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { id: 'won', label: 'Κλεισμένη Πώληση', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
];

export default function SalesPipeline() {
  const [deals, setDeals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States για το Pop-up
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // { deal, type }
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  useEffect(() => {
    if (customers.length > 0 && deals.length === 0) {
      setDeals(customers.map(c => ({ ...c, stage: c.stage || 'lead' })));
    }
  }, [customers]);

  // Φιλτράρισμα βάσει ΑΦΜ, Ονόματος, Email, Τηλεφώνου
  const filteredDeals = deals.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tax_id?.includes(searchTerm) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.includes(searchTerm)
  );

  const openActionModal = (deal, type) => {
    setActiveAction({ deal, type });
    setMessage(''); // Reset το μήνυμα
    setIsModalOpen(true);
  };

  const handleConfirmSend = async () => {
    setIsSending(true);
    // Προσομοίωση αποστολής (εδώ θα έμπαινε η κλήση API)
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    let nextStage = activeAction.type === 'PROPOSAL' ? 'proposal' : 'won';
    
    setDeals(prev => prev.map(d => 
      d.id === activeAction.deal.id ? { ...d, stage: nextStage } : d
    ));

    setIsSending(false);
    setIsModalOpen(false);
    setActiveAction(null);
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      <PageHeader 
        title="Sales Pipeline" 
        subtitle="Διαδραστική διαχείριση και αυτοματισμοί εγγράφων"
      />

      {/* SEARCH BAR */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Αναζήτηση με Όνομα, ΑΦΜ, Email ή Τηλέφωνο..." 
          className="pl-10 h-11 bg-white border-slate-200 shadow-sm rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-280px)]">
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex flex-col bg-slate-50/60 rounded-3xl border border-slate-200/60 p-4">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl shadow-sm", stage.color)}>
                  <stage.icon size={18} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">{stage.label}</h3>
              </div>
              <Badge variant="outline" className="bg-white text-slate-400 border-slate-200">
                {filteredDeals.filter(d => d.stage === stage.id).length}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              <AnimatePresence mode='popLayout'>
                {filteredDeals.filter(d => d.stage === stage.id).map((deal) => (
                  <motion.div
                    key={deal.id}
                    layoutId={deal.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className="shadow-sm border-slate-200/80 hover:border-blue-500 transition-all bg-white rounded-2xl group">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-2">
                           <p className="font-bold text-slate-900 text-sm truncate">{deal.name}</p>
                           <TrendingUp size={14} className="text-slate-200" />
                        </div>
                        
                        <div className="space-y-1 mb-4">
                          <p className="text-[10px] text-slate-400 font-mono uppercase">ΑΦΜ: {deal.tax_id || '—'}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Mail size={10} /> {deal.email || '—'}
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-2 border-t border-slate-50">
                          {stage.id === 'lead' && (
                            <Button 
                              onClick={() => openActionModal(deal, 'PROPOSAL')}
                              className="w-full h-8 text-[10px] font-bold gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl"
                            >
                              <Send size={12} /> ΣΤΕΙΛΕ ΠΡΟΣΦΟΡΑ
                            </Button>
                          )}

                          {stage.id === 'proposal' && (
                            <Button 
                              onClick={() => openActionModal(deal, 'INVOICE')}
                              className="w-full h-8 text-[10px] font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                            >
                              <FileCheck size={12} /> ΣΤΕΙΛΕ ΤΙΜΟΛΟΓΙΟ
                            </Button>
                          )}

                          {stage.id === 'won' && (
                            <div className="flex items-center justify-center gap-2 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[10px] font-black uppercase">
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

      {/* ACTION MODAL (POP-UP) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {activeAction?.type === 'PROPOSAL' ? 'Προετοιμασία Προσφοράς' : 'Έκδοση Τιμολογίου'}
            </DialogTitle>
            <DialogDescription>
              Θα σταλεί email στον πελάτη <strong>{activeAction?.deal.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-[11px] p-3 bg-slate-50 rounded-2xl border">
               <div>
                 <p className="text-slate-400 font-bold uppercase">Email</p>
                 <p className="text-slate-700">{activeAction?.deal.email || 'Δεν έχει οριστεί'}</p>
               </div>
               <div>
                 <p className="text-slate-400 font-bold uppercase">Τηλέφωνο</p>
                 <p className="text-slate-700">{activeAction?.deal.phone || '—'}</p>
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 ml-1">ΣΥΝΟΔΕΥΤΙΚΟ ΜΗΝΥΜΑ (ΠΡΟΑΙΡΕΤΙΚΟ)</label>
              <Textarea 
                placeholder="Γράψε εδώ μια σημείωση για τον πελάτη..."
                className="rounded-xl resize-none focus:ring-blue-500"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl">Ακύρωση</Button>
            <Button 
              disabled={isSending}
              onClick={handleConfirmSend}
              className={cn(
                "rounded-xl gap-2 min-w-[140px]",
                activeAction?.type === 'PROPOSAL' ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSending ? 'Αποστολή...' : 'Επιβεβαίωση'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
