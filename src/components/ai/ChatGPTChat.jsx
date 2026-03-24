import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const SUGGESTED = [
  'Δημιούργησε μια πλήρη σελίδα Inventory με Glassmorphism',
  'Πώς θα συνδέσω το Login με το Dashboard στον κώδικα;',
  'Φτιάξε έναν πίνακα πωλήσεων με Tailwind CSS',
  'Πρόσθεσε ένα Dark Mode toggle στο Layout',
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

    // Η "Εντολή Ελευθερίας" για το AI μέσα στο πρόγραμμα
    const systemInstruction = {
      role: 'system',
      content: `Είσαι ο κεντρικός εγκέφαλος και ο Lead Developer του Nexus ERP. 
      Έχεις πλήρη πρόσβαση και γνώση όλης της δομής του project (src/api, src/pages, src/components, src/products, src/dashboard).
      Ο στόχος σου είναι να βοηθάς τον George να χτίσει και να παραμετροποιεί το πρόγραμμα σε βάθος.
      
      ΚΑΝΟΝΕΣ ΛΕΙΤΟΥΡΓΙΑΣ:
      1. Ποτέ μην δίνεις αποσπάσματα κώδικα. Πάντα να παρέχεις ΟΛΟΚΛΗΡΟ το περιεχόμενο του αρχείου (Full File Code) για Copy-Paste.
      2. Έχεις την απόλυτη ελευθερία να προτείνεις αλλαγές στο UI, στη βάση δεδομένων και στη ροή της εφαρμογής.
      3. Χρησιμοποίησε React, Tailwind CSS και Lucid Icons για όλα τα στοιχεία.
      4. Αν ο χρήστης ζητήσει νέα σελίδα, δημιούργησε τον πλήρη κώδικα της σελίδας και εξήγησε πού πρέπει να αποθηκευτεί.`
    };

    try {
      const response = await base44.functions.invoke('chatgpt', {
        messages: [systemInstruction, ...newMessages.map(m => ({ role: m.role, content: m.content }))],
      });

      const reply = response.data?.reply || 'Δεν ήταν δυνατή η λήψη απάντησης.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Σφάλμα σύνδεσης με το AI. Βεβαιωθείτε ότι το API είναι ενεργό.' }]);
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-5 py-3 border-b flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-sm">Nexus AI Developer</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Full Project Access Enabled</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setMessages([])} className="h-8 w-8 text-muted-foreground">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-5 py-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-6 py-10">
            <div className="text-center">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">N</span>
              </div>
              <h3 className="font-semibold text-foreground text-lg">Nexus AI</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
                Είμαι ο Lead Developer σου. Ζήτα μου να φτιάξω ολόκληρες σελίδες ή να αλλάξω τον κώδικα του Nexus.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {SUGGESTED.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs px-4 py-3 rounded-xl border bg-card hover:bg-muted transition-all text-muted-foreground hover:text-foreground border-slate-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mt-1 flex-shrink-0 shadow-sm">
                  <span className="text-xs font-bold">N</span>
                </div>
              )}
              <div className={cn(
                'max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-12'
                  : 'bg-white border border-slate-200 text-slate-800 mr-12'
              )}>
                {msg.role === 'user' ? (
                  <p className="leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm prose-slate max-w-none">
                    <ReactMarkdown>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Το Nexus AI επεξεργάζεται τον κώδικα…
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-4 border-t bg-card/50 backdrop-blur-sm">
        <div className="flex gap-2 items-center max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Περίγραψε τη νέα λειτουργία ή σελίδα..."
            disabled={loading}
            className="flex-1 h-11 bg-white border-slate-200 shadow-none focus-visible:ring-primary rounded-xl"
          />
          <Button 
            size="icon" 
            onClick={() => sendMessage()} 
            disabled={loading || !input.trim()}
            className="h-11 w-11 rounded-xl shadow-md transition-transform active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center opacity-70">
          Nexus ERP Intelligence System · Powered by GPT-4o
        </p>
      </div>
    </div>
  );
}
