import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Search, Activity, Clock, User, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function LiveUsers() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [nowTime, setNowTime] = useState(new Date());
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);

  // Refresh time every second
  useEffect(() => {
    const interval = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if super admin
  const isSuperAdmin = user?.role === 'super_admin' || user?.is_super_admin;
  if (!isSuperAdmin) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Δεν έχετε πρόσβαση</p>
      </div>
    );
  }

  // Get all activities from last 24 hours
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['user-activities'],
    queryFn: async () => {
      const all = await base44.entities.UserActivity.list('-timestamp', 1000);
      // Filter last 24 hours
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      return all.filter(a => new Date(a.timestamp).getTime() > dayAgo);
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Group by user and get latest activity
  const userSessions = {};
  activities.forEach(activity => {
    if (!userSessions[activity.user_email]) {
      userSessions[activity.user_email] = {
        email: activity.user_email,
        name: activity.user_name,
        latestActivity: activity,
        allActivities: [],
      };
    }
    userSessions[activity.user_email].allActivities.push(activity);
    if (new Date(activity.timestamp) > new Date(userSessions[activity.user_email].latestActivity.timestamp)) {
      userSessions[activity.user_email].latestActivity = activity;
    }
  });

  // Calculate idle time
  const getUserIdleTime = (userEmail) => {
    const userActivities = userSessions[userEmail]?.allActivities || [];
    if (!userActivities.length) return null;

    const latest = userActivities[0]; // Already sorted by recency
    const idleMs = nowTime.getTime() - new Date(latest.timestamp).getTime();
    const idleMinutes = Math.floor(idleMs / 60000);

    return { idleMs, idleMinutes, latestTime: new Date(latest.timestamp) };
  };

  // Get active users (activity in last 5 minutes)
  const activeUsers = Object.values(userSessions)
    .map(session => ({
      ...session,
      idleTime: getUserIdleTime(session.email),
    }))
    .filter(s => s.idleTime && s.idleTime.idleMinutes <= 5)
    .sort((a, b) => a.idleTime.idleMs - b.idleTime.idleMs);

  // Get idle users (activity > 5 minutes ago)
  const idleUsers = Object.values(userSessions)
    .map(session => ({
      ...session,
      idleTime: getUserIdleTime(session.email),
    }))
    .filter(s => s.idleTime && s.idleTime.idleMinutes > 5)
    .sort((a, b) => b.idleTime.idleMinutes - a.idleTime.idleMinutes);

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

  return (
    <Card className={cn('rounded-xl border transition-all', isActive ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200')}>
      <CardContent className="pt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', isActive ? 'bg-emerald-200' : 'bg-amber-200')}>
            <User className="w-5 h-5 text-slate-700" />
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
          <p className="text-2xl font-black text-slate-900">{idleMinutes}</p>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wide">λεπτά</p>
          <p className="text-xs text-slate-500 mt-1">
            {latestActivity?.timestamp ? format(new Date(latestActivity.timestamp), 'HH:mm', { locale: el }) : '—'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityModal({ userEmail, onClose }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['user-activity-detail', userEmail],
    queryFn: async () => {
      const all = await base44.entities.UserActivity.list('-timestamp', 100);
      return all.filter(a => a.user_email === userEmail);
    },
    refetchInterval: 3000,
  });

  const userName = activities[0]?.user_name || userEmail;

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
        ) : activities.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Καμία δραστηριότητα</p>
        ) : (
          <div className="space-y-2">
            {activities.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {activity.page_name || activity.action}
                    </Badge>
                    {activity.details && (
                      <span className="text-xs text-slate-600">{activity.details}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {format(new Date(activity.timestamp), 'HH:mm:ss', { locale: el })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}