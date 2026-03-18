import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Paperclip, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function EmailMessageModal({ message, open, onClose }) {
  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold pr-8">{message.subject || '(no subject)'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {message.direction === 'incoming' ? (
                <Badge className="gap-1 bg-blue-100 text-blue-700 border-blue-200 border text-[11px]">
                  <ArrowDownLeft className="w-3 h-3" /> Εισερχόμενο
                </Badge>
              ) : (
                <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200 border text-[11px]">
                  <ArrowUpRight className="w-3 h-3" /> Εξερχόμενο
                </Badge>
              )}
              {message.has_attachments && (
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <Paperclip className="w-3 h-3" /> Attachments
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground font-medium">Από:</span>
              <span>{message.sender_name ? `${message.sender_name} <${message.sender_email}>` : message.sender_email}</span>
              <span className="text-muted-foreground font-medium">Προς:</span>
              <span>{(message.recipient_emails || []).join(', ') || '—'}</span>
              {message.cc_emails?.length > 0 && (
                <>
                  <span className="text-muted-foreground font-medium">CC:</span>
                  <span>{message.cc_emails.join(', ')}</span>
                </>
              )}
              <span className="text-muted-foreground font-medium">Ημερομηνία:</span>
              <span>{message.sent_at ? format(new Date(message.sent_at), 'dd MMM yyyy, HH:mm', { locale: el }) : '—'}</span>
              <span className="text-muted-foreground font-medium">Πελάτης:</span>
              <span>{message.customer_name || '—'}</span>
            </div>
          </div>

          {/* Body */}
          <div className="border rounded-lg overflow-hidden">
            {message.body_html ? (
              <iframe
                srcDoc={message.body_html}
                className="w-full min-h-[300px] border-0"
                sandbox="allow-same-origin"
                title="email-body"
                onLoad={e => {
                  try {
                    e.target.style.height = e.target.contentDocument.body.scrollHeight + 20 + 'px';
                  } catch {}
                }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm p-4 text-foreground font-sans">
                {message.body_text || message.snippet || '(no content)'}
              </pre>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}