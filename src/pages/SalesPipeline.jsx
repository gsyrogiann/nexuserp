import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  ArrowRight,
  FileCheck,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Ορισμός των Σταδίων
const STAGES = [
  { id: 'lead', label: 'Νέο Lead', color: 'bg-slate-100 text-slate-600', icon: UserPlus },
  { id: 'proposal', label: 'Προσφορά', color: 'bg-blue-100 text-blue-700', icon: FileText },
  { id: 'negotiation', label: 'Διαπραγμάτευση', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { id: 'won', label: 'Κλεισμένη Πώληση', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
];

export default function SalesPipeline() {
  const [deals, setDeals] = useState([]);
  const qc = useQueryClient();

  // Φορτώνουμε τους πελάτες για να τους μετατρέψουμε σε Deals
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  useEffect(() => {
    if (customers.length > 0 && deals.length === 0) {
      setDeals(customers.map(c => ({ ...c, stage: c.stage || 'lead' })));
    }
  }, [customers]);

  // Ο ΑΥΤΟΜΑΤΙΣΜΟΣ ΣΟΥ: Μετακίνηση βάσει εγγράφου
  const handleAutoMove = (dealId, docType) => {
    let nextStage = 'lead';
    if (docType === 'PROPOSAL') nextStage = 'proposal';
    if (docType === 'INVOICE') nextStage = 'won';

    setDeals(prev => prev.map(d => 
      d.id === dealId ? { ...d, stage: nextStage } : d
    ));

    // Ειδοποίηση επιτυχίας
    const stageLabel = STAGES.find(s => s.id === nextStage).label;
    console.log(`Automation: ${docType} sent. Moving to ${stageLabel}`);
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      <PageHeader 
        title="Sales Pipeline" 
        subtitle="Αυτοματοποιημένη ροή πωλήσεων"
        actionLabel="Προσθήκη Lead"
        onAction={() => {}}
      />

      {/* Kanban Board Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-250px)]">
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex flex-col bg-slate-50/60 rounded-3xl border border-slate-200/60 p-4">
            {/* Header Στήλης */}
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl shadow-sm", stage.color)}>
                  <stage.icon size={18} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">{stage.label}</h3>
              </div>
              <Badge variant="outline" className="bg-white text-slate-400 border-slate-200">
                {deals.filter(d => d.stage === stage.id).length}
              </Badge>
            </div>

            {/* Λίστα με Κάρτες */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              <AnimatePresence mode='popLayout'>
                {deals.filter(d => d.stage === stage.id).map((deal) => (
                  <motion.div
                    key={deal.id}
                    layoutId={deal.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <Card className="shadow-sm border-slate-200/80 hover:border-blue-500 hover:shadow-md transition-all group bg-white rounded-2xl">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-3">
                           <p className="font-bold text-slate-900 text-sm leading-tight">{deal.name}</p>
                           <TrendingUp size={14} className="text-slate-300" />
                        </div>
                        
                        <p className="text-[10px] text-slate-400 font-mono mb-5 uppercase tracking-tighter">
                          ΑΦΜ: {deal.tax_id || '—'}
                        </p>
                        
                        {/* ΕΔΩ ΕΙΝΑΙ ΟΙ ΑΥΤΟΜΑΤΙΣΜΟΙ ΣΟΥ */}
                        <div className="space-y-2">
                          {stage.id === 'lead' && (
                            <Button 
                              onClick={() => handleAutoMove(deal.id, 'PROPOSAL')}
                              className="w-full h-8 text-[10px] font-bold gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm rounded-xl"
                            >
                              <Send size={12} /> ΑΠΟΣΤΟΛΗ ΠΡΟΣΦΟΡΑΣ
                            </Button>
                          )}

                          {stage.id === 'proposal' && (
                            <Button 
                              onClick={() => handleAutoMove(deal.id, 'INVOICE')}
                              className="w-full h-8 text-[10px] font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl"
                            >
                              <FileCheck size={12} /> ΕΚΔΟΣΗ ΤΙΜΟΛΟΓΙΟΥ
                            </Button>
                          )}

                          {stage.id === 'won' && (
                            <div className="flex items-center justify-center gap-2 py-1 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                              <CheckCircle2 size={12} />
                              <span className="text-[10px] font-black uppercase">Ολοκληρώθηκε</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                          <span className="text-[11px] font-black text-slate-900">€{deal.balance?.toLocaleString('el-GR') || '0'}</span>
                          <p className="text-[9px] text-slate-400 font-medium">Nexus ERP Automations</p>
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
    </div>
  );
}
