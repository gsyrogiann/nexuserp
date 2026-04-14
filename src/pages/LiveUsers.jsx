import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Search, Activity, Clock, User, X, MousePointerClick, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function LiveUsers() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);

  const isSuperAdmin = user?.role === 'super_admin' || user?.is_super_admin;
  const { data: liveUsers = [], isLoading } = useQuery({
     queryKey: ['live-users-snapshot'],
     queryFn: async () => {
       const res = await base44.functions.invoke('getLiveUsersSnapshot', {});
       return res?.data?.users ?? [];
     },
     enabled: isSuperAdmin,
     refetchInterval: 15000,
   });

  if (!isSuperAdmin) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Δεν έχετε πρόσβαση</p>
      </div>
    );
  }

  const activeUsers = liveUsers
    .filter((session) => session.isActive)
    .sort((a, b) => (a.idleTime?.idleMs || 0) - (b.idleTime?.idleMs || 0));

  const idleUsers = liveUsers
    .filter((session) => !session.isActive)
    .sort((a, b) => (b.idleTime?.idleMinutes || 0) - (a.idleTime?.idleMinutes || 0));

  const filteredActive = activeUsers.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredIdle = idleUsers.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Φόρτωση...</div>;
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <PageHeader title="Live Users" subtitle="Παρακολούθηση ενεργών χρηστών σε πραγματικό χρόνο" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Αναζήτηση χρήστη..."
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Active Users */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          Ενεργοί Χρήστες ({filteredActive.length})
        </h2>
        {filteredActive.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Κανείς δεν είναι online
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredActive.map(session => (
              <div
                key={session.email}
                onClick={() => setSelectedUserEmail(session.email)}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <UserCard session={session} isActive={true} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Idle Users */}
      {filteredIdle.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Αδρανείς Χρήστες ({filteredIdle.length})
          </h2>
          <div className="grid gap-3">
            {filteredIdle.map(session => (
              <div
                key={session.email}
                onClick={() => setSelectedUserEmail(session.email)}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <UserCard session={session} isActive={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {selectedUserEmail && (
        <ActivityModal
          userEmail={selectedUserEmail}
          onClose={() => setSelectedUserEmail(null)}
        />
      )}
    </div>
  );
}

function UserCard({ session, isActive }) {
   const idleMinutes = session.idleTime?.idleMinutes || 0;
   const latestActivity = session.latestActivity;
   const isInactive = idleMinutes > 5;

   return (
     <Card className={cn('rounded-xl border transition-all', isInactive ? 'bg-red-50/50 border-red-200' : isActive ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200')}>
      <CardContent className="pt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', isInactive ? 'bg-red-200' : isActive ? 'bg-emerald-200' : 'bg-amber-200')}>
              {isInactive ? <AlertCircle className="w-5 h-5 text-red-700" /> : <User className="w-5 h-5 text-slate-700" />}
            </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-slate-900">{session.name}</p>
            <p className="text-xs text-slate-600 truncate">{session.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={cn('text-[10px] font-bold rounded-full px-2 h-5', isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                {latestActivity?.page_name || latestActivity?.action}
              </Badge>
              {latestActivity?.details && (
                <span className="text-[10px] text-slate-500 truncate max-w-xs">{latestActivity.details}</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
           <p className={cn('text-2xl font-black', isInactive ? 'text-red-900' : 'text-slate-900')}>{idleMinutes}</p>
           <p className={cn('text-[10px] font-bold uppercase tracking-wide', isInactive ? 'text-red-600' : 'text-slate-600')}>λεπτά</p>
           {isInactive && <p className="text-[10px] text-red-600 font-bold mt-1">⚠️ Ανενεργός</p>}
           <p className="text-xs text-slate-500 mt-1">
             {latestActivity?.timestamp ? format(new Date(latestActivity.timestamp), 'HH:mm', { locale: el }) : '—'}
           </p>
         </div>
      </CardContent>
    </Card>
  );
}

function ActivityModal({ userEmail, onClose }) {
   const { data: activities = [], isLoading: activitiesLoading } = useQuery({
     queryKey: ['user-activity-detail', userEmail],
     queryFn: async () => {
       const all = await base44.entities.UserActivity.list('-timestamp', 100);
       return all.filter(a => a.user_email === userEmail);
     },
     refetchInterval: 3000,
   });

   const { data: emails = [], isLoading: emailsLoading } = useQuery({
     queryKey: ['user-emails-detail', userEmail],
     queryFn: async () => {
       const all = await base44.entities.EmailMessage.list('-sent_at', 100);
       return all.filter(e => e.sender_email === userEmail);
     },
     refetchInterval: 3000,
   });

   const isLoading = activitiesLoading || emailsLoading;
   const userName = activities[0]?.user_name || userEmail;

   // Merge and sort activities and emails by timestamp
   const allItems = [
     ...activities.map(a => ({ ...a, type: 'activity', sortTime: new Date(a.timestamp).getTime() })),
     ...emails.map(e => ({ ...e, type: 'email', sortTime: new Date(e.sent_at).getTime() }))
   ].sort((a, b) => b.sortTime - a.sortTime);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Δραστηριότητα: {userName}</DialogTitle>
          <button onClick={onClose} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        {isLoading ? (
           <p className="text-center py-8 text-muted-foreground">Φόρτωση...</p>
         ) : allItems.length === 0 ? (
           <p className="text-center py-8 text-muted-foreground">Καμία δραστηριότητα</p>
         ) : (
           <div className="space-y-2">
             {allItems.map((item, idx) => {
               const isActivity = item.type === 'activity';
               return (
                 <div
                   key={idx}
                   className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                 >
                   <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                       <div className="flex items-center gap-1.5">
                         {isActivity && item.action === 'page_visit' && <Eye className="w-3.5 h-3.5 text-blue-600" />}
                         {isActivity && item.action === 'button_click' && <MousePointerClick className="w-3.5 h-3.5 text-purple-600" />}
                         {!isActivity && <span className="text-base">📧</span>}
                       </div>
                       <Badge variant="outline" className="text-[10px] font-bold">
                         {isActivity ? (
                           item.action === 'page_visit' ? `📄 ${item.page_name}` : '🖱️ Action'
                         ) : (
                           '📧 Email'
                         )}
                       </Badge>
                       {isActivity && item.details && (
                         <span className="text-xs text-slate-600 truncate">{item.details}</span>
                       )}
                       {!isActivity && (
                         <span className="text-xs text-slate-600 truncate">{item.subject}</span>
                       )}
                     </div>
                     <p className="text-xs text-slate-500">
                       {format(new Date(isActivity ? item.timestamp : item.sent_at), 'HH:mm:ss', { locale: el })}
                     </p>
                   </div>
                 </div>
               );
             })}
           </div>
         )}
      </DialogContent>
    </Dialog>
  );
}
