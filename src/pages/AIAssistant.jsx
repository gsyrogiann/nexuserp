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
  Users, Package, CheckCircle2, AlertCircle, Trash2, X, Pencil, 
  ShieldAlert, Ticket, History, Plus, MessageSquare, Clock
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

// --- UI COMPONENTS ---
function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  const isAction = msg.type === 'action';
  const isTicket = msg.type === 'ticket';
  return (
    <div className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm',
          isAction ? 'bg-green-100' : isTicket ? 'bg-purple-100' : 'bg-primary/10')}>
          {isAction ? <Pencil className="w-4 h-4 text-green-600" /> : isTicket ? <Ticket className="w-4 h-4 text-purple-600" /> : <Sparkles className="w-4 h-4 text-primary" />}
        </div>
      )}
      <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
        isUser ? 'bg-slate-900 text-white rounded-tr-none' :
        isAction ? 'bg-green-50 border border-green-200 text-slate-800' :
        isTicket ? 'bg-purple-50 border border-purple-200 text-slate-800' :
        'bg-white border border-slate-200 text-slate-800 rounded-tl-none')}>
        <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {msg.content}
        </ReactMarkdown>
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
  const [conversations, setConversations] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [pendingAction, setPendingAction] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const qc = useQueryClient();

  const handleImportDone = (msg) => {
    setActiveTab('chat');
    setMessages(prev => [...prev, { role: 'assistant', type: 'action', content: msg }]);
  };

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('nexus_assistant_history');
    if (savedHistory) {
      try { setConversations(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('nexus_assistant_history', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Data fetching
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets'], queryFn: () => base44.entities.ServiceTicket.list('-created_date') });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setPendingAction(null);
  };

  const loadConversation = (conv) => {
    setCurrentChatId(conv.id);
    setMessages(conv.messages);
    setPendingAction(null);
  };

  const deleteConversation = (e, id) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    localStorage.setItem('nexus_assistant_history', JSON.stringify(updated));
    if (currentChatId === id) startNewChat();
  };

  const buildContext = useCallback(() => {
    const nextTicketNum = `TKT-${String(tickets.length + 1).padStart(4, '0')}`;
    return `Είσαι ο Nexus AI Admin. Έχεις πρόσβαση στα Entities: Customer, ServiceTicket.
    ΠΕΛΑΤΕΣ: ${JSON.stringify(customers.map(c => ({ id: c.id, name: c.name })))}
    TICKETS: ${tickets.length} σύνολο. Επόμενος κωδικός: ${nextTicketNum}
    Χρησιμοποίησε block \`\`\`action για αλλαγές. Απάντα ΠΑΝΤΑ στα Ελληνικά.`;
  }, [customers, tickets]);

  const parseAction = (text) => {
    const match = text.match(/```action\s*([\s\S]*?)```/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  };
  const stripAction = (text) => text.replace(/```action[\s\S]*?```/g, '').trim();

  const executeAction = async (action) => {
    try {
      if (action.action === 'create_ticket') {
        await base44.entities.ServiceTicket.create(action.ticket_data);
        await qc.invalidateQueries({ queryKey: ['tickets'] });
        const successMsg = { role: 'assistant', type: 'ticket', content: `✅ **Ticket ${action.ticket_data.ticket_number} δημιουργήθηκε!**` };
        const updatedMessages = [...messages, successMsg];
        setMessages(updatedMessages);
        updateHistory(updatedMessages);
      } else if (action.action === 'send_email') {
        await base44.functions.invoke('sendEmail', {
          to: action.to,
          subject: action.subject,
          body: action.body
        });
        const successMsg = { role: 'assistant', type: 'action', content: `✅ **Email στάλθηκε στο ${action.to}!**` };
        const updatedMessages = [...messages, successMsg];
        setMessages(updatedMessages);
        updateHistory(updatedMessages);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Σφάλμα: ${err.message}` }]);
    }
    setPendingAction(null);
  };

  const updateHistory = (newMessages, firstUserMsg) => {
    if (!currentChatId) {
      const newId = Date.now().toString();
      setCurrentChatId(newId);
      const newConv = {
        id: newId,
        title: firstUserMsg?.substring(0, 30) || "New Session",
        date: new Date().toLocaleDateString('el-GR'),
        messages: newMessages
      };
      setConversations(prev => [newConv, ...prev]);
    } else {
      setConversations(prev => prev.map(c => 
        c.id === currentChatId ? { ...c, messages: newMessages } : c
      ));
    }
  };

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const userMsg = { role: 'user', content: msg };
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser); setInput(''); setLoading(true);
    
    const startTime = Date.now();
    try {
      const response = await base44.functions.invoke('chatgpt', { 
        messages: [{ role: 'system', content: buildContext() }, ...updatedWithUser.map(m => ({ role: m.role, content: m.content }))] 
      });
      
      const replyText = response.data?.reply || 'Σφάλμα απόκρισης.';
      const action = parseAction(replyText);
      const assistantMsg = { role: 'assistant', content: stripAction(replyText) };
      const finalMessages = [...updatedWithUser, assistantMsg];
      
      const responseTime = Date.now() - startTime;
      const user = await base44.auth.me();
      
      // Log interaction
      base44.entities.AIInteraction.create({
        source: 'app',
        user_identifier: user?.email || 'unknown',
        query: msg,
        response: replyText,
        response_time_ms: responseTime,
        success: true
      }).catch(err => console.warn('AI interaction log failed:', err));
      
      setMessages(finalMessages);
      updateHistory(finalMessages, msg);
      if (action) setPendingAction(action);
    } catch (err) {
      const responseTime = Date.now() - startTime;
      const user = await base44.auth.me();
      
      // Log failed interaction
      base44.entities.AIInteraction.create({
        source: 'app',
        user_identifier: user?.email || 'unknown',
        query: msg,
        response: err.message || 'Unknown error',
        response_time_ms: responseTime,
        success: false
      }).catch(() => {});
      
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Σφάλμα σύνδεσης.` }]);
    }
    setLoading(false); inputRef.current?.focus();
  }, [input, loading, messages, buildContext, currentChatId]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg"><Bot className="w-6 h-6" /></div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Nexus AI Engine</h1>
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest leading-none mt-1">Full System Control</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500">
          <History className="w-4 h-4 mr-2" /> History
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-fit bg-slate-100 p-1 rounded-xl mb-4">
          <TabsTrigger value="chat" className="gap-2 rounded-lg"><MessageSquare className="w-4 h-4" /> Console</TabsTrigger>
          <TabsTrigger value="import-customers" className="gap-2 rounded-lg"><Users className="w-4 h-4" /> Customers</TabsTrigger>
          <TabsTrigger value="import-products" className="gap-2 rounded-lg"><Package className="w-4 h-4" /> Products</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex overflow-hidden mt-0 gap-4">
          
          {/* History Sidebar */}
          <aside className={cn(
            "bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-300 overflow-hidden",
            sidebarOpen ? "w-64" : "w-0 border-none"
          )}>
            <div className="p-4 w-64 h-full flex flex-col">
              <Button onClick={startNewChat} className="w-full bg-slate-900 hover:bg-blue-600 mb-6 text-xs gap-2">
                <Plus className="w-3 h-3" /> New Session
              </Button>
              <ScrollArea className="flex-1">
                <div className="space-y-1 pr-3">
                  {conversations.map(conv => (
                    <div key={conv.id} onClick={() => loadConversation(conv)} className={cn(
                      "group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all",
                      currentChatId === conv.id ? "bg-white border border-slate-200 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-white/50"
                    )}>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Clock className="w-3 h-3 opacity-50 flex-shrink-0" />
                        <p className="text-[11px] font-bold truncate">{conv.title}</p>
                      </div>
                      <button onClick={(e) => deleteConversation(e, conv.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </aside>

          {/* Main Chat Area */}
          <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 shadow-2xl shadow-slate-200/50 bg-white rounded-2xl relative">
            <ScrollArea className="flex-1 px-6 py-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-6 py-20 animate-in fade-in duration-500">
                  <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-2xl"><Sparkles className="w-10 h-10" /></div>
                  <div className="text-center">
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter">NEXUS AI CONSOLE</h3>
                    <p className="text-xs text-slate-500 mt-2 max-w-xs font-medium uppercase tracking-widest">Awaiting Command...</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto w-full">
                  {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
                  {loading && (
                    <div className="flex items-center gap-3 text-[11px] font-black text-blue-600 bg-blue-50 w-fit px-4 py-2 rounded-full border border-blue-100 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" /> EXECUTING COMMAND...
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} className="h-10" />
            </ScrollArea>

            {/* Action Overlay */}
            {pendingAction && (
              <div className="absolute bottom-24 left-6 right-6 p-5 border-2 border-blue-100 bg-blue-50/95 backdrop-blur-md rounded-2xl shadow-2xl animate-in slide-in-from-bottom-6 z-20">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg"><ShieldAlert className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-blue-900 uppercase tracking-tighter">System Action Pending</p>
                    <p className="text-sm text-blue-800 mt-1 font-semibold">{pendingAction.confirmation_message}</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold shadow-md shadow-blue-200" onClick={() => executeAction(pendingAction)}>CONFIRM & EXECUTE</Button>
                  <Button size="sm" variant="ghost" className="flex-1 text-slate-500 font-bold" onClick={() => setPendingAction(null)}>CANCEL</Button>
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="px-6 py-5 border-t bg-slate-50/50">
              <div className="flex gap-3 max-w-3xl mx-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                <Input 
                  ref={inputRef} 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())} 
                  placeholder='π.χ. "Φτιάξε ticket για βλάβη εκτυπωτή στον Παπαδόπουλο"' 
                  disabled={loading} 
                  className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 text-sm h-11" 
                />
                <Button size="icon" onClick={() => sendMessage()} disabled={loading || !input.trim()} className="rounded-xl h-11 w-11 bg-slate-900 hover:bg-blue-600 transition-all active:scale-90">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="import-customers" className="mt-0">
          <Card className="p-6 max-w-2xl border-slate-200 rounded-2xl shadow-xl"><ImportPanel type="customers" onImportDone={handleImportDone} /></Card>
        </TabsContent>
        <TabsContent value="import-products" className="mt-0">
          <Card className="p-6 max-w-2xl border-slate-200 rounded-2xl shadow-xl"><ImportPanel type="products" onImportDone={handleImportDone} /></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}