import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, Loader2, Trash2, Copy, Check,
  Terminal, History, Plus, MessageSquare, Clock 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export default function ChatGPTChat() {
  // --- STATE ---
  const [conversations, setConversations] = useState([]); // Όλο το ιστορικό
  const [currentChatId, setCurrentChatId] = useState(null); // ID της τρέχουσας συνομιλίας
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    // Φόρτωση ιστορικού από το localStorage κατά την εκκίνηση
    const savedHistory = localStorage.getItem('nexus_ai_history');
    if (savedHistory) {
      setConversations(JSON.parse(savedHistory));
    }
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => {
    // Αποθήκευση ιστορικού κάθε φορά που αλλάζει μια συνομιλία
    if (conversations.length > 0) {
      localStorage.setItem('nexus_ai_history', JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // --- ACTIONS ---
  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setInput('');
  };

  const loadConversation = (conv) => {
    setCurrentChatId(conv.id);
    setMessages(conv.messages);
  };

  const deleteConversation = (e, id) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    localStorage.setItem('nexus_ai_history', JSON.stringify(updated));
    if (currentChatId === id) startNewChat();
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    const systemInstruction = {
      role: 'system',
      content: `Είσαι ο Nexus Core AI (Admin Mode). 
      CONTEXT: Entities (Customer, Supplier, Quote, SalesOrder, PurchaseOrder, ServiceTicket, Product).
      ΟΔΗΓΙΕΣ: Δίνε πλήρη κώδικα, μίλα ως Lead Developer, εκτέλεσε εντολές διαγραφής/τροποποίησης αμέσως.`
    };

    try {
      const response = await base44.functions.invoke('chatgpt', {
        messages: [
          systemInstruction,
          ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
        ]
      });

      const replyContent = response.data?.reply || 'Σφάλμα απόκρισης.';
      const assistantMessage = { role: 'assistant', content: replyContent, timestamp: new Date().toISOString() };
      const finalMessages = [...updatedMessages, assistantMessage];
      
      setMessages(finalMessages);

      // ΕΝΗΜΕΡΩΣΗ ΙΣΤΟΡΙΚΟΥ
      let newId = currentChatId;
      if (!currentChatId) {
        newId = Date.now().toString();
        setCurrentChatId(newId);
        const newConv = {
          id: newId,
          title: msg.substring(0, 30) + (msg.length > 30 ? '...' : ''),
          date: new Date().toLocaleDateString('el-GR'),
          messages: finalMessages
        };
        setConversations(prev => [newConv, ...prev]);
      } else {
        setConversations(prev => prev.map(c => 
          c.id === currentChatId ? { ...c, messages: finalMessages } : c
        ));
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '🚨 Σφάλμα σύνδεσης με τον πυρήνα.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      
      {/* --- SIDEBAR ΙΣΤΟΡΙΚΟΥ --- */}
      <div className={cn(
        "bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 border-r border-slate-800",
        sidebarOpen ? "w-72" : "w-0 opacity-0"
      )}>
        <div className="p-4 flex flex-col h-full">
          <Button 
            onClick={startNewChat}
            className="w-full justify-start gap-2 bg-slate-800 hover:bg-blue-600 text-white border-none mb-6 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New Control Session
          </Button>

          <div className="flex items-center gap-2 px-2 mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <History className="w-3 h-3" />
            Session History
          </div>

          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-1">
              {conversations.length === 0 && (
                <div className="text-center py-10 text-slate-600 text-xs italic">
                  No previous sessions
                </div>
              )}
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                    currentChatId === conv.id 
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                      : "hover:bg-slate-800 text-slate-400"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium truncate">{conv.title}</p>
                      <p className="text-[9px] opacity-50 flex items-center gap-1">
                        <Clock className="w-2 h-2" /> {conv.date}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => deleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* --- ΚΥΡΙΩΣ CHAT --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-500"
            >
              <History className="w-5 h-5" />
            </Button>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-none flex items-center gap-2">
                Nexus AI Admin Mode
                {currentChatId && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">ID: {currentChatId}</span>}
              </h3>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-1">Live System Access</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto py-10 px-6">
            {messages.length === 0 ? (
              <div className="text-center space-y-6 mt-10 animate-in fade-in duration-700">
                <div className="h-16 w-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-200">
                  <Terminal className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Core Connected</h2>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto">
                    Δώσε μια εντολή για να ξεκινήσεις μια νέα συνεδρία ελέγχου στο Nexus ERP.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex gap-4', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'group relative max-w-[85%] rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-sm',
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-tr-none'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                    )}>
                      {msg.role === 'assistant' && (
                        <button 
                          onClick={() => copyToClipboard(msg.content, i)}
                          className="absolute -top-3 -right-3 p-2 bg-white border rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 hover:text-blue-600"
                        >
                          {copiedIndex === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                      <ReactMarkdown className="prose prose-sm prose-slate dark:prose-invert max-w-none break-words">
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {loading && (
              <div className="mt-8 flex items-center gap-3 text-blue-600 bg-blue-50 w-fit px-6 py-3 rounded-2xl border border-blue-100 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest">Processing Command...</span>
              </div>
            )}
            <div ref={bottomRef} className="h-20" />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-6 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 bg-slate-100 p-2 rounded-2xl border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Εντολή συστήματος..."
                disabled={loading}
                className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 h-12 text-base"
              />
              <Button 
                onClick={() => sendMessage()} 
                disabled={loading || !input.trim()}
                className="rounded-xl h-12 px-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
