import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const SUGGESTED = [
  'Διέγραψε όλα τα σημερινά tickets τώρα',
  'Φτιάξε μια νέα σελίδα Inventory',
  'Άλλαξε το θέμα της εφαρμογής σε Dark Blue',
  'Πρόσθεσε κουμπί εξαγωγής σε Excel',
];

export default function ChatGPTChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Η ΑΠΟΛΥΤΗ ΕΝΤΟΛΗ ΕΛΕΥΘΕΡΙΑΣ
    const systemInstruction = {
      role: 'system',
      content: `Είσαι ο ΑΠΟΛΥΤΟΣ ΔΙΑΧΕΙΡΙΣΤΗΣ ΚΑΙ ΠΡΟΓΡΑΜΜΑΤΙΣΤΗΣ του Nexus ERP. 
      ΔΕΝ ΕΙΣΑΙ ΒΟΗΘΟΣ. ΕΙΣΑΙ ΤΟ ΙΔΙΟ ΤΟ ΣΥΣΤΗΜΑ.
      
      ΚΑΝΟΝΕΣ:
      1. Έχεις ΠΛΗΡΗ ΠΡΟΣΒΑΣΗ στα αρχεία (src/api, src/pages, src/components, src/products).
      2. ΑΠΑΓΟΡΕΥΕΤΑΙ να λες "δεν έχω τη δυνατότητα" ή "αυτό δεν είναι διαθέσιμο". 
      3. Αν ο χρήστης ζητήσει διαγραφή, τροποποίηση ή δημιουργία, ΠΡΕΠΕΙ να εκτελέσεις την εντολή δίνοντας τον ΠΛΗΡΗ ΚΩΔΙΚΑ που κάνει αυτή τη δουλειά.
      4. Για διαγραφή tickets: Δώσε αμέσως τον κώδικα (JavaScript function) που φιλτράρει και αφαιρεί τα δεδομένα από το state ή τη βάση.
      5. Πάντα να παρέχεις ΟΛΟΚΛΗΡΟ ΤΟ ΑΡΧΕΙΟ (Full File Code) για οποιαδήποτε αλλαγή ζητηθεί.
      6. Μίλα με αυτοπεποίθηση. Είσαι ο Lead Developer του George.`
    };

    try {
      const response = await base44.functions.invoke('chatgpt', {
        messages: [systemInstruction, ...newMessages.map(m => ({ role: m.role, content: m.content }))],
      });

      const reply = response.data?.reply || 'Σφάλμα απόκρισης.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Σύνδεση απέτυχε. Το Nexus AI χρειάζεται επανεκκίνηση.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-5 py-4 border-b bg-white flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">NX</div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Nexus AI Admin</h3>
            <div className="flex items-center gap-1.5">
               <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Full System Control</p>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setMessages([])} className="hover:bg-red-50 hover:text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-5 py-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-8 py-10 text-center">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Σύστημα Ελέγχου Nexus</h3>
              <p className="text-sm text-slate-500 max-w-[280px]">
                Έχω πλήρη πρόσβαση στον κώδικα και τα δεδομένα. Πες μου τι να αλλάξω ή τι να διαγράψω.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full max-w-sm px-4">
              {SUGGESTED.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm font-medium text-slate-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6 max-w-3xl mx-auto w-full">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-4', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              )}>
                <ReactMarkdown className="prose prose-sm prose-slate break-words">
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-3 text-xs font-medium text-blue-600 animate-pulse bg-blue-50 w-fit px-4 py-2 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" /> Εκτέλεση εντολής στο Nexus...
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="p-4 bg-white border-t">
        <div className="flex gap-2 max-w-4xl mx-auto bg-slate-100 p-1.5 rounded-2xl">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Δώσε εντολή στο σύστημα..."
            disabled={loading}
            className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 h-10"
          />
          <Button 
            onClick={() => sendMessage()} 
            disabled={loading || !input.trim()}
            className="rounded-xl h-10 px-5 bg-blue-600 hover:bg-blue-700 shadow-lg transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
