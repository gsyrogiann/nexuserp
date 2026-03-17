import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import MessageBubble from '../components/ai/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Plus, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTED = [
  'What are my top 5 customers by revenue?',
  'Show me overdue invoices',
  'What products are low on stock?',
  'Summarize this month\'s sales',
  'Which supplier do I owe the most to?',
  'List open purchase orders',
];

export default function AIAssistant() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    base44.agents.listConversations({ agent_name: 'erp_assistant' })
      .then(setConversations)
      .finally(() => setLoadingConvs(false));
  }, []);

  // Subscribe to active conversation
  useEffect(() => {
    if (!activeConvId) return;
    const unsub = base44.agents.subscribeToConversation(activeConvId, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [activeConvId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewConversation = useCallback(async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'erp_assistant',
      metadata: { name: `Chat ${new Date().toLocaleDateString('el-GR')}` },
    });
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(conv.id);
    setMessages([]);
    inputRef.current?.focus();
  }, []);

  const loadConversation = useCallback(async (convId) => {
    setActiveConvId(convId);
    const conv = await base44.agents.getConversation(convId);
    setMessages(conv.messages || []);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    let convId = activeConvId;
    if (!convId) {
      const conv = await base44.agents.createConversation({
        agent_name: 'erp_assistant',
        metadata: { name: msg.slice(0, 40) },
      });
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
      convId = conv.id;
    }

    setInput('');
    setSending(true);
    const conv = await base44.agents.getConversation(convId);
    await base44.agents.addMessage(conv, { role: 'user', content: msg });
    setSending(false);
    inputRef.current?.focus();
  }, [input, sending, activeConvId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Sidebar: conversation list */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-2">
        <Button onClick={startNewConversation} className="w-full gap-2" size="sm">
          <Plus className="w-4 h-4" /> New Chat
        </Button>
        <Card className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {loadingConvs && (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
                </div>
              )}
              {!loadingConvs && conversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No conversations yet</p>
              )}
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={cn(
                    'w-full text-left text-xs px-3 py-2 rounded-lg transition-colors truncate',
                    conv.id === activeConvId
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <MessageSquare className="w-3 h-3 inline mr-1.5 opacity-60" />
                  {conv.metadata?.name || 'Chat'}
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Main chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/30">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">ERP AI Assistant</p>
            <p className="text-[11px] text-muted-foreground">
              {activeConvId ? (activeConv?.metadata?.name || 'Active conversation') : 'Ask anything about your business data'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-5 py-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-6 py-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground">How can I help you today?</h3>
                <p className="text-sm text-muted-foreground mt-1">Ask about customers, invoices, stock, sales and more.</p>
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
              <MessageBubble key={i} message={msg} />
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </ScrollArea>

        {/* Input */}
        <div className="px-4 py-3 border-t bg-muted/20">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your business data…"
              disabled={sending}
              className="flex-1 text-sm"
            />
            <Button
              size="icon"
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </Card>
    </div>
  );
}