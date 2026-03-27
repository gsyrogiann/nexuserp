import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Bot, Send, Loader2, Sparkles, Upload, FileSpreadsheet,
  Users, Package, CheckCircle2, AlertCircle, Trash2, X, Pencil, ShieldAlert, Ticket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

// --- UTILS ---
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  }).filter(r => Object.values(r).some(v => v !== ''));
}

function mapToCustomer(row) {
  const get = (...keys) => { for (const k of keys) { const v = row[k] || row[k.replace(/_/g,' ')] || row[k.replace(/_/g,'')] || ''; if (v) return v; } return ''; };
  return { name: get('name','company','company_name','επωνυμια','επωνυμία'), tax_id: get('tax_id','afm','αφμ','vat'), phone: get('phone','phone1','τηλεφωνο'), mobile: get('mobile','κινητο'), email: get('email','mail'), address: get('address','διευθυνση'), city: get('city','πολη'), postal_code: get('postal_code','zip','tk'), status: 'active' };
}

function mapToProduct(row) {
  const get = (...keys) => { for (const k of keys) { const v = row[k] || row[k.replace(/_/g,' ')] || ''; if (v) return v; } return ''; };
  return { sku: get('sku','code','κωδικος'), name: get('name','product','product_name','περιγραφη'), category: get('category','κατηγορια'), sell_price: parseFloat(get('sell_price','price','τιμη')) || 0, buy_price: parseFloat(get('buy_price','cost','κοστος')) || 0, vat_rate: parseFloat(get('vat_rate','vat','φπα')) || 24, unit: get('unit','uom','μοναδα') || 'piece', status: 'active' };
}

// --- COMPONENTS ---
function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  const isAction = msg.type === 'action';
  const isTicket = msg.type === 'ticket';
  return (
    <div className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
          isAction ? 'bg-green-100' : isTicket ? 'bg-purple-100' : 'bg-primary/10')}>
          {isAction ? <Pencil className="w-4 h-4 text-green-600" /> : isTicket ? <Ticket className="w-4 h-4 text-purple-600" /> : <Sparkles className="w-4 h-4 text-primary" />}
        </div>
      )}
      <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
        isUser ? 'bg-slate-800 text-white shadow-sm' :
        isAction ? 'bg-green-50 border border-green-200' :
        isTicket ? 'bg-purple-50 border border-purple-200' :
        'bg-white border border-slate-200 shadow-sm')}>
        {isUser ? (
          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function ImportPanel({ type, onImportDone }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const fileRef = useRef();
  const qc = useQueryClient();
  const handleFile = (e) => { const file = e.target.files[0]; if (!file) return; setFileName(file.name); setResults(null); const reader = new FileReader(); reader.onload = (ev) => setRows(parseCSV(ev.target.result)); reader.readAsText(file, 'UTF-8'); };
  const handleImport = async () => {
    if (!rows.length) return; setImporting(true); let ok = 0, fail = 0;
    for (const row of rows) { try { const mapped = type === 'customers' ? mapToCustomer(row) : mapToProduct(row); if (!mapped.name && !mapped.sku) { fail++; continue; } if (type === 'customers') await base44.entities.Customer.create(mapped); else await base44.entities.Product.create(mapped); ok++; } catch { fail++; } }
    await qc.invalidateQueries({ queryKey: [type === 'customers' ? 'customers' : 'products'] });
    setResults({ ok, fail }); setImporting(false);
    if (ok > 0) onImportDone?.(`Εισήχθησαν ${ok} ${type === 'customers' ? 'πελάτες' : 'προϊόντα'} επιτυχώς!`);
  };
  const reset = () => { setRows([]); setFileName(''); setResults(null); fileRef.current.value = ''; };
  const isCustomer = type === 'customers';
  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">{isCustomer ? <Users className="w-6 h-6 text-primary" /> : <Package className="w-6 h-6 text-primary" />}</div>
          <div><p className="font-medium text-sm">{isCustomer ? 'Εισαγωγή Πελατών' : 'Εισαγωγή Προϊόντων'} από CSV</p><p className="text-xs text-muted-foreground mt-1">{isCustomer ? 'Στήλες: name, tax_id, phone, email, address, city' : 'Στήλες: sku, name, category, sell_price, buy_price, vat_rate, unit'}</p></div>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileRef.current.click()}><Upload className="w-4 h-4 mr-2" />Επιλογή αρχείου CSV</Button>
        </div>
      </div>
      {fileName && (<div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg"><FileSpreadsheet className="w-4 h-4 text-blue-600" /><span className="text-sm text-blue-700 flex-1">{fileName}</span><Badge variant="outline">{rows.length} εγγραφές</Badge><button onClick={reset}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button></div>)}
      {rows.length > 0 && !results && (<><div className="rounded-lg border overflow-hidden"><div className="bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">Προεπισκόπηση (πρώτες 3 εγγραφές)</div><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b bg-muted/20">{Object.keys(rows[0]).slice(0,6).map(k=><th key={k} className="px-3 py-1.5 text-left font-medium text-muted-foreground">{k}</th>)}</tr></thead><tbody>{rows.slice(0,3).map((r,i)=><tr key={i} className="border-b last:border-0">{Object.values(r).slice(0,6).map((v,j)=><td key={j} className="px-3 py-1.5 truncate max-w-[120px]">{v}</td>)}</tr>)}</tbody></table></div></div><Button onClick={handleImport} disabled={importing} className="w-full">{importing?<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Εισαγωγή σε εξέλιξη…</>:<><Upload className="w-4 h-4 mr-2"/>Εισαγωγή {rows.length} εγγραφών</>}</Button></>)}
      {results && (<div className="space-y-2">{results.ok>0&&<div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg"><CheckCircle2 className="w-4 h-4 text-green-600"/><span className="text-sm text-green-700">{results.ok} εγγραφές εισήχθησαν επιτυχώς</span></div>}{results.fail>0&&<div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg"><AlertCircle className="w-4 h-4 text-red-600"/><span className="text-sm text-red-700">{results.fail} εγγραφές απέτυχαν</span></div>}<Button variant="outline" size="sm" onClick={reset} className="w-full">Νέα εισαγωγή</Button></div>)}
    </div>
  );
}

// --- MAIN PAGE ---
export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [pendingAction, setPendingAction] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const qc = useQueryClient();

  // Data fetching
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: salesInvoices = [] } = useQuery({ queryKey: ['salesInvoices'], queryFn: () => base44.entities.SalesInvoice.list() });
  const { data: payments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list() });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => base44.entities.SalesOrder.list() });
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets'], queryFn: () => base44.entities.ServiceTicket.list('-created_date') });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const buildContext = useCallback(() => {
    const totalRevenue = salesInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const unpaid = salesInvoices.filter(i => i.status === 'unpaid' || i.status === 'overdue');
    const openTickets = tickets.filter(t => t.status === 'open');
    const nextTicketNum = `TKT-${String(tickets.length + 1).padStart(4, '0')}`;
    
    return `Είσαι ο Nexus AI Admin, ο απόλυτος Lead Developer του ERP.
    
== ΔΕΔΟΜΕΝΑ ==
ΠΕΛΑΤΕΣ (${customers.length}) | ΠΡΟΪΟΝΤΑ (${products.length})
ΕΣΟΔΑ: €${totalRevenue.toFixed(2)} | ΑΠΛΗΡΩΤΑ: ${unpaid.length}
TICKETS: ${tickets.length} (${openTickets.length} ανοιχτά) | Επόμενο: ${nextTicketNum}

== ΔΥΝΑΤΟΤΗΤΕΣ ==
- Ενημέρωση πελατών μέσω JSON action block.
- Δημιουργία Service Tickets.
- Ανάλυση πωλήσεων και αποθεμάτων.

Όταν εκτελείς αλλαγές, χρησιμοποίησε το block \`\`\`action. Απάντα ΠΑΝΤΑ στα Ελληνικά.`;
  }, [customers, products, salesInvoices, payments, salesOrders, tickets]);

  const parseAction = (text) => {
    const match = text.match(/```action\s*([\s\S]*?)```/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  };
  const stripAction = (text) => text.replace(/```action[\s\S]*?```/g, '').trim();

  const executeAction = async (action) => {
    try {
      if (action.action === 'update_customer') {
        await base44.entities.Customer.update(action.customer_id, action.changes);
        await qc.invalidateQueries({ queryKey: ['customers'] });
        setMessages(prev => [...prev, { role: 'assistant', type: 'action', content: `✅ **Επιτυχία!** Ο πελάτης **${action.customer_name}** ενημερώθηκε.` }]);
      } else if (action.action === 'create_ticket') {
        await base44.entities.ServiceTicket.create(action.ticket_data);
        await qc.invalidateQueries({ queryKey: ['tickets'] });
        setMessages(prev => [...prev, { role: 'assistant', type: 'ticket', content: `🎫 **Ticket δημιουργήθηκε!** Αριθμός: ${action.ticket_data.ticket_number}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Σφάλμα: ${err.message}` }]);
    }
    setPendingAction(null);
  };

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages); setInput(''); setLoading(true);
    
    try {
      // Χρησιμοποιούμε ΜΟΝΟ το ChatGPT μέσω base44 functions (ασφαλής μέθοδος)
      const response = await base44.functions.invoke('chatgpt', { 
        messages: [{ role: 'system', content: buildContext() }, ...newMessages.map(m => ({ role: m.role, content: m.content }))] 
      });
      
      const reply = response.data?.reply || 'Δεν ήταν δυνατή η λήψη απάντησης.';
      const action = parseAction(reply);
      setMessages(prev => [...prev, { role: 'assistant', content: stripAction(reply) }]);
      if (action) setPendingAction(action);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Σφάλμα σύνδεσης με τον πυρήνα AI.` }]);
    }
    setLoading(false); inputRef.current?.focus();
  }, [input, loading, messages, buildContext]);

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleImportDone = (msg) => { setMessages(prev => [...prev, { role: 'assistant', content: `✅ ${msg}` }]); setActiveTab('chat'); };

  const SUGGESTIONS = ['📊 Αναφορά πωλήσεων', '👥 Κορυφαίοι πελάτες', '✏️ Ενημέρωση στοιχείων πελάτη', '🎫 Δημιουργία νέου ticket'];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] gap-4">
      {/* HEADER - CLEANED (No model toggle) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm"><Bot className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Nexus AI Admin</h1>
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">OpenAI Powered Core</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-fit bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="chat" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"><Bot className="w-4 h-4" /> AI Console</TabsTrigger>
          <TabsTrigger value="import-customers" className="gap-2 rounded-lg data-[state=active]:bg-white"><Users className="w-4 h-4" /> Import Customers</TabsTrigger>
          <TabsTrigger value="import-products" className="gap-2 rounded-lg data-[state=active]:bg-white"><Package className="w-4 h-4" /> Import Products</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-3">
          <Card className="flex-1 flex flex-col overflow-hidden p-0 border-slate-200 shadow-xl shadow-slate-200/50">
            <ScrollArea className="flex-1 px-5 py-6 bg-white">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-6 py-12 text-center animate-in fade-in duration-500">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-2xl shadow-slate-300"><Sparkles className="w-8 h-8" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">System Interface Ready</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm">Έχω πλήρη πρόσβαση στα δεδομένα του ERP. Ζήτησε μου μια ανάλυση ή μια ενέργεια.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                    {SUGGESTIONS.map(s => (<button key={s} onClick={() => sendMessage(s)} className="text-left text-xs px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-500 hover:shadow-md transition-all font-medium text-slate-600">{s}</button>))}
                  </div>
                </div>
              )}
              <div className="max-w-3xl mx-auto w-full">
                {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
                {loading && (<div className="flex items-center gap-3 text-xs font-bold text-blue-600 mb-4 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Επεξεργασία εντολής στο Nexus...</div>)}
              </div>
              <div ref={bottomRef} />
            </ScrollArea>

            {/* ACTION PANEL */}
            {pendingAction && (
              <div className="mx-6 mb-4 p-5 border-2 border-blue-100 bg-blue-50 rounded-2xl shadow-lg animate-in slide-in-from-bottom-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-600 rounded-lg text-white"><ShieldAlert className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-blue-900 uppercase tracking-tight">Επιβεβαίωση Ενέργειας</p>
                    <p className="text-xs text-blue-700 mt-1 font-medium">{pendingAction.confirmation_message}</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold" onClick={() => executeAction(pendingAction)}>Εκτέλεση</Button>
                  <Button size="sm" variant="ghost" className="flex-1 text-slate-500" onClick={() => setPendingAction(null)}>Ακύρωση</Button>
                </div>
              </div>
            )}

            {/* INPUT BOX */}
            <div className="px-6 py-5 border-t bg-slate-50/50">
              <div className="flex gap-3 max-w-3xl mx-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:border-blue-500 transition-all">
                <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder='Δώσε μια εντολή...' disabled={loading} className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 text-sm h-10" />
                <Button size="icon" onClick={() => sendMessage()} disabled={loading || !input.trim()} className="rounded-xl h-10 w-10 bg-slate-900 hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="import-customers" className="mt-3">
          <Card className="p-6 max-w-2xl border-slate-200"><ImportPanel type="customers" onImportDone={handleImportDone} /></Card>
        </TabsContent>
        <TabsContent value="import-products" className="mt-3">
          <Card className="p-6 max-w-2xl border-slate-200"><ImportPanel type="products" onImportDone={handleImportDone} /></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
