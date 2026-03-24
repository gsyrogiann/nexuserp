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

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  const isAction = msg.type === 'action';
  const isTicket = msg.type === 'ticket';
  return (
    <div className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
          isAction ? 'bg-green-100' : isTicket ? 'bg-purple-100' : 'bg-primary/10')}>
          {isAction ? <Pencil className="w-4 h-4 text-green-600" /> : isTicket ? <Ticket className="w-4 h-4 text-purple-600" /> : <Bot className="w-4 h-4 text-primary" />}
        </div>
      )}
      <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
        isUser ? 'bg-slate-800 text-white' :
        isAction ? 'bg-green-50 border border-green-200' :
        isTicket ? 'bg-purple-50 border border-purple-200' :
        'bg-white border border-slate-200')}>
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

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiModel, setAiModel] = useState('claude');
  const [activeTab, setActiveTab] = useState('chat');
  const [pendingAction, setPendingAction] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const qc = useQueryClient();

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
    return `Είσαι ο AI βοηθός του NexusERP. Έχεις πρόσβαση σε πραγματικά δεδομένα ΚΑΙ μπορείς να κάνεις αλλαγές στη βάση δεδομένων.

== ΔΕΔΟΜΕΝΑ ==
ΠΕΛΑΤΕΣ (${customers.length}):
${JSON.stringify(customers.map(c => ({ id: c.id, name: c.name, tax_id: c.tax_id, phone: c.phone, mobile: c.mobile, email: c.email, city: c.city, address: c.address, balance: c.balance, status: c.status, category: c.category, payment_terms: c.payment_terms, credit_limit: c.credit_limit, notes: c.notes })))}

ΠΡΟΪΟΝΤΑ (${products.length}):
${JSON.stringify(products.slice(0,30).map(p => ({ id: p.id, sku: p.sku, name: p.name, sell_price: p.sell_price, buy_price: p.buy_price, vat_rate: p.vat_rate, status: p.status })))}

ΤΙΜΟΛΟΓΙΑ ΠΩΛΗΣΕΩΝ: ${salesInvoices.length} σύνολο | Έσοδα: €${totalRevenue.toFixed(2)} | Απλήρωτα: ${unpaid.length}
${JSON.stringify(salesInvoices.slice(0,15).map(i => ({ number: i.number, customer: i.customer_name, total: i.total, status: i.status, date: i.date })))}

TICKETS SERVICE (${tickets.length} σύνολο | ${openTickets.length} ανοιχτά):
${JSON.stringify(tickets.slice(0,10).map(t => ({ id: t.id, number: t.ticket_number, title: t.title, customer: t.customer, status: t.status, priority: t.priority })))}
Επόμενος αριθμός ticket: ${nextTicketNum}

ΠΑΡΑΓΓΕΛΙΕΣ: ${salesOrders.length} | ΠΛΗΡΩΜΕΣ: ${payments.length}

== ΕΝΤΟΛΕΣ ΕΠΕΞΕΡΓΑΣΙΑΣ ==
Όταν ο χρήστης ζητά να αλλάξει πελάτη:
\`\`\`action
{
  "action": "update_customer",
  "customer_id": "<id>",
  "customer_name": "<όνομα>",
  "changes": { "<πεδίο>": "<τιμή>" },
  "confirmation_message": "<μήνυμα>"
}
\`\`\`

Όταν ο χρήστης ζητά να δημιουργήσει ticket:
\`\`\`action
{
  "action": "create_ticket",
  "ticket_data": {
    "ticket_number": "${nextTicketNum}",
    "title": "<τίτλος>",
    "description": "<περιγραφή>",
    "customer": "<πελάτης>",
    "contact_name": "",
    "contact_phone": "",
    "contact_email": "",
    "status": "open",
    "priority": "<low|normal|high|critical>",
    "category": "<technical|commercial|complaint|other>",
    "assigned_to": "",
    "due_date": "",
    "internal_notes": ""
  },
  "confirmation_message": "<μήνυμα επιβεβαίωσης>"
}
\`\`\`

Έγκυρα πεδία πελάτη: name, tax_id, phone, mobile, email, address, city, postal_code, balance, status, category, payment_terms, credit_limit, notes
Αν ο χρήστης ΔΕΝ ζητά αλλαγή, απάντα κανονικά χωρίς JSON block.
Απάντα ΠΑΝΤΑ στα Ελληνικά.`;
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
        setMessages(prev => [...prev, { role: 'assistant', type: 'action', content: `✅ **Επιτυχία!** Ο πελάτης **${action.customer_name}** ενημερώθηκε:\n${Object.entries(action.changes).map(([k, v]) => `- **${k}**: ${v}`).join('\n')}` }]);
      } else if (action.action === 'create_ticket') {
        await base44.entities.ServiceTicket.create(action.ticket_data);
        await qc.invalidateQueries({ queryKey: ['tickets'] });
        setMessages(prev => [...prev, { role: 'assistant', type: 'ticket', content: `🎫 **Ticket δημιουργήθηκε!**\n- **Αριθμός:** ${action.ticket_data.ticket_number}\n- **Τίτλος:** ${action.ticket_data.title}\n- **Πελάτης:** ${action.ticket_data.customer || '—'}\n- **Προτεραιότητα:** ${action.ticket_data.priority}\n- **Κατηγορία:** ${action.ticket_data.category}\n\nΜπορείς να το δεις στη σελίδα **Service Tickets**.` }]);
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
      let reply = '';
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      if (aiModel === 'claude') {
        const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: buildContext(), messages: apiMessages }) });
        const data = await response.json();
        reply = data.content?.map(b => b.text || '').join('') || 'Δεν ήταν δυνατή η λήψη απάντησης.';
      } else {
        const response = await base44.functions.invoke('chatgpt', { messages: [{ role: 'system', content: buildContext() }, ...apiMessages] });
        reply = response.data?.reply || 'Δεν ήταν δυνατή η λήψη απάντησης.';
      }
      const action = parseAction(reply);
      setMessages(prev => [...prev, { role: 'assistant', content: stripAction(reply) }]);
      if (action) setPendingAction(action);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Σφάλμα: ${err.message}` }]);
    }
    setLoading(false); inputRef.current?.focus();
  }, [input, loading, messages, aiModel, buildContext]);

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleImportDone = (msg) => { setMessages(prev => [...prev, { role: 'assistant', content: `✅ ${msg}` }]); setActiveTab('chat'); };

  const isTicketAction = pendingAction?.action === 'create_ticket';
  const actionStyle = isTicketAction ? { bg: 'bg-purple-50 border-purple-200', icon: 'text-purple-600', title: 'text-purple-800', text: 'text-purple-700', details: 'text-purple-600', btn: 'bg-purple-600 hover:bg-purple-700' } : { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-600', title: 'text-amber-800', text: 'text-amber-700', details: 'text-amber-600', btn: 'bg-green-600 hover:bg-green-700' };

  const SUGGESTIONS = ['📊 Δώσε μου αναφορά πωλήσεων', '👥 Ποιοι είναι οι κορυφαίοι 5 πελάτες;', '✏️ Άλλαξε το τηλέφωνο του πελάτη [όνομα] σε [αριθμό]', '🎫 Φτιάξε ticket για τον πελάτη [όνομα] με θέμα [πρόβλημα]', '🔴 Φτιάξε κρίσιμο ticket για βλάβη εξοπλισμού', '💰 Πόσα τιμολόγια είναι απλήρωτα;'];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Bot className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="font-bold text-lg">AI Βοηθός ERP</h1>
            <p className="text-xs text-muted-foreground">{customers.length} πελάτες · {products.length} προϊόντα · {tickets.filter(t=>t.status==='open').length} ανοιχτά tickets</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setAiModel('claude')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all', aiModel==='claude'?'bg-white shadow-sm text-foreground':'text-muted-foreground hover:text-foreground')}><Bot className="w-3.5 h-3.5" /> Claude</button>
          <button onClick={() => setAiModel('chatgpt')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all', aiModel==='chatgpt'?'bg-white shadow-sm text-foreground':'text-muted-foreground hover:text-foreground')}><Sparkles className="w-3.5 h-3.5" /> ChatGPT</button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-fit">
          <TabsTrigger value="chat" className="gap-2"><Bot className="w-4 h-4" /> Συνομιλία & Ενέργειες</TabsTrigger>
          <TabsTrigger value="import-customers" className="gap-2"><Users className="w-4 h-4" /> Εισαγωγή Πελατών</TabsTrigger>
          <TabsTrigger value="import-products" className="gap-2"><Package className="w-4 h-4" /> Εισαγωγή Προϊόντων</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-3">
          <Card className="flex-1 flex flex-col overflow-hidden p-0">
            <ScrollArea className="flex-1 px-5 py-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-6 py-10">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Bot className="w-8 h-8 text-primary" /></div>
                  <div className="text-center">
                    <h3 className="font-semibold">{aiModel==='claude'?'🤖 Claude AI':'✨ ChatGPT'} — Βοηθός ERP</h3>
                    <p className="text-sm text-muted-foreground mt-1">Μπορώ να απαντώ ερωτήσεις, να επεξεργάζομαι πελάτες <strong>και να δημιουργώ tickets!</strong></p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                    {SUGGESTIONS.map(s => (<button key={s} onClick={() => sendMessage(s)} className="text-left text-xs px-3 py-2 rounded-xl border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">{s}</button>))}
                  </div>
                </div>
              )}
              <div>
                {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
                {loading && (<div className="flex items-center gap-2 text-xs text-muted-foreground mb-4"><Loader2 className="w-3 h-3 animate-spin" />{aiModel==='claude'?'Το Claude σκέφτεται…':'Το ChatGPT σκέφτεται…'}</div>)}
              </div>
              <div ref={bottomRef} />
            </ScrollArea>

            {pendingAction && (
              <div className={cn('mx-4 mb-3 p-4 border rounded-xl', actionStyle.bg)}>
                <div className="flex items-start gap-3">
                  {isTicketAction ? <Ticket className={cn('w-5 h-5 flex-shrink-0 mt-0.5', actionStyle.icon)} /> : <ShieldAlert className={cn('w-5 h-5 flex-shrink-0 mt-0.5', actionStyle.icon)} />}
                  <div className="flex-1">
                    <p className={cn('text-sm font-semibold', actionStyle.title)}>{isTicketAction ? '🎫 Δημιουργία νέου Ticket' : 'Επιβεβαίωση αλλαγής'}</p>
                    <p className={cn('text-xs mt-1', actionStyle.text)}>{pendingAction.confirmation_message}</p>
                    <div className={cn('mt-1 text-xs space-y-0.5', actionStyle.details)}>
                      {isTicketAction && pendingAction.ticket_data && (<>
                        <p>• <strong>Αριθμός:</strong> {pendingAction.ticket_data.ticket_number}</p>
                        <p>• <strong>Τίτλος:</strong> {pendingAction.ticket_data.title}</p>
                        {pendingAction.ticket_data.customer && <p>• <strong>Πελάτης:</strong> {pendingAction.ticket_data.customer}</p>}
                        <p>• <strong>Προτεραιότητα:</strong> {pendingAction.ticket_data.priority}</p>
                        <p>• <strong>Κατηγορία:</strong> {pendingAction.ticket_data.category}</p>
                      </>)}
                      {!isTicketAction && pendingAction.changes && Object.entries(pendingAction.changes).map(([k, v]) => (<p key={k}>• <strong>{k}</strong>: {String(v)}</p>))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className={cn('flex-1', actionStyle.btn)} onClick={() => executeAction(pendingAction)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />{isTicketAction ? 'Ναι, δημιούργησε το ticket' : 'Ναι, κάνε την αλλαγή'}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setPendingAction(null); setMessages(prev => [...prev, { role: 'assistant', content: '❌ Η ενέργεια ακυρώθηκε.' }]); }}>
                    <X className="w-3.5 h-3.5 mr-1.5" /> Ακύρωση
                  </Button>
                </div>
              </div>
            )}

            <div className="px-4 py-3 border-t bg-muted/20">
              <div className="flex gap-2">
                {messages.length > 0 && (<Button variant="outline" size="icon" onClick={() => { setMessages([]); setPendingAction(null); }} title="Εκκαθάριση"><Trash2 className="w-4 h-4" /></Button>)}
                <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder='π.χ. "Φτιάξε ticket για τον Παπαδόπουλο - βλάβη εκτυπωτή"' disabled={loading} className="flex-1 text-sm" />
                <Button size="icon" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-muted-foreground">Αλλαγές πελατών · Δημιουργία tickets · Enter για αποστολή</p>
                <Badge variant="outline" className="text-[10px] h-5">{aiModel==='claude'?'🤖 Claude':'✨ ChatGPT'}</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="import-customers" className="mt-3">
          <Card className="p-6 max-w-2xl"><ImportPanel type="customers" onImportDone={handleImportDone} /></Card>
        </TabsContent>
        <TabsContent value="import-products" className="mt-3">
          <Card className="p-6 max-w-2xl"><ImportPanel type="products" onImportDone={handleImportDone} /></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
