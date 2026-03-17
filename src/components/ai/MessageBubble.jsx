import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Bot, User, ChevronRight, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'function';
  const status = toolCall?.status || 'pending';

  const cfg = {
    pending: { icon: Clock, color: 'text-muted-foreground', spin: false },
    running: { icon: Loader2, color: 'text-primary', spin: true },
    in_progress: { icon: Loader2, color: 'text-primary', spin: true },
    completed: { icon: CheckCircle2, color: 'text-emerald-600', spin: false },
    success: { icon: CheckCircle2, color: 'text-emerald-600', spin: false },
    failed: { icon: AlertCircle, color: 'text-destructive', spin: false },
    error: { icon: AlertCircle, color: 'text-destructive', spin: false },
  }[status] || { icon: Clock, color: 'text-muted-foreground', spin: false };

  const Icon = cfg.icon;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs text-muted-foreground hover:bg-muted transition-colors"
      >
        <Icon className={cn('w-3 h-3', cfg.color, cfg.spin && 'animate-spin')} />
        <span className="font-mono">{name.replace(/\./g, ' › ')}</span>
        {!cfg.spin && <ChevronRight className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')} />}
      </button>
      {expanded && toolCall.results && (
        <pre className="mt-1 ml-4 p-2 rounded-md bg-muted text-xs overflow-auto max-h-40 text-muted-foreground whitespace-pre-wrap">
          {typeof toolCall.results === 'string' ? toolCall.results : JSON.stringify(toolCall.results, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className={cn('max-w-[80%]', isUser && 'flex flex-col items-end')}>
        {message.content && (
          <div className={cn(
            'rounded-2xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border shadow-sm'
          )}>
            {isUser ? (
              <p>{message.content}</p>
            ) : (
              <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {message.tool_calls?.map((tc, i) => <FunctionDisplay key={i} toolCall={tc} />)}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}