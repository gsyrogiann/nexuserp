import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const SUGGESTED = [
  'Πώς μπορώ να βελτιώσω την είσπραξη οφειλών;',
  'Τι στρατηγική τιμολόγησης προτείνεις;',
  'Πώς να διαχειριστώ καλύτερα το απόθεμα;',
  'Συμβουλές για διαπραγμάτευση με προμηθευτές',
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

    const response = await base44.functions.invoke('chatgpt', {
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
    });

    const reply = response.data?.reply || 'Δεν ήταν δυνατή η λήψη απάντησης.';
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 px-5 py-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-6 py-10">
            <div className="text-center">
              <h3 className="font-semibold text-foreground">ChatGPT (GPT-4o)</h3>
              <p className="text-sm text-muted-foreground mt-1">Γενικές επιχειρηματικές συμβουλές και ανάλυση.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs px-3 py-2 rounded-xl border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <span className="text-xs font-bold text-emerald-700">G</span>
                </div>
              )}
              <div className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200'
              )}>
                {msg.role === 'user' ? (
                  <p className="leading-relaxed">{msg.content}</p>
                ) : (
                  <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Το ChatGPT σκέφτεται…
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-muted/20">
        <div className="flex gap-2">
          {messages.length > 0 && (
            <Button variant="outline" size="icon" onClick={() => setMessages([])} title="Εκκαθάριση">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ρώτα το ChatGPT…"
            disabled={loading}
            className="flex-1 text-sm"
          />
          <Button size="icon" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Enter για αποστολή · Η συνομιλία δεν αποθηκεύεται</p>
      </div>
    </div>
  );
}