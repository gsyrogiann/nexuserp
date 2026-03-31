import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/lib/usePermissions.jsx';
import { ROLE_LABELS, ROLES } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Shield, Crown, UserCheck, Users, AlertTriangle, Mail, Search } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-red-100 text-red-800 border-red-200',
  manager: 'bg-blue-100 text-blue-800 border-blue-200',
  employee: 'bg-slate-100 text-slate-700 border-slate-200',
  user: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function UserManagement() {
  const { isSuperAdmin: superAdmin, user: currentUser } = usePermissions();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('Ο χρήστης ενημερώθηκε');
    },
    onError: () => toast.error('Σφάλμα ενημέρωσης'),
  });

  // Guard: prevent removing last super admin
  const superAdmins = users.filter(u => u.is_super_admin || u.role === 'super_admin');

  const handleRoleChange = (userId, newRole) => {
    updateMutation.mutate({ id: userId, data: { role: newRole } });
  };

  const handleSuperAdminToggle = (user, value) => {
    if (!value && superAdmins.length <= 1) {
      toast.error('Δεν μπορείς να αφαιρέσεις τον τελευταίο Super Admin!');
      return;
    }
    updateMutation.mutate({ id: user.id, data: { is_super_admin: value } });
  };

  const handleActiveToggle = (user, value) => {
    if (user.id === currentUser?.id) {
      toast.error('Δεν μπορείς να απενεργοποιήσεις τον εαυτό σου');
      return;
    }
    updateMutation.mutate({ id: user.id, data: { is_active: value } });
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole === 'super_admin' || inviteRole === 'admin' ? 'admin' : 'user');
      toast.success(`Πρόσκληση στάλθηκε στο ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail('');
    } catch (e) {
      toast.error('Σφάλμα: ' + e.message);
    } finally {
      setInviting(false);
    }
  };

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Φόρτωση...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Αναζήτηση χρήστη..." className="pl-8 h-9 rounded-xl" />
        </div>
        {superAdmin && (
          <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-2 rounded-xl font-bold">
            <Mail className="w-4 h-4" /> Πρόσκληση
          </Button>
        )}
        <Badge className="bg-slate-100 text-slate-600 border border-slate-200">
          <Users className="w-3 h-3 mr-1" /> {users.length} χρήστες
        </Badge>
      </div>

      <div className="space-y-3">
        {filtered.map(u => (
          <Card key={u.id} className={`rounded-2xl border transition-all ${u.is_active === false ? 'opacity-50' : ''}`}>
            <CardContent className="py-4 px-5 flex items-center gap-4 flex-wrap">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-base font-black text-slate-500 shrink-0">
                {(u.full_name || u.email || '?')[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-slate-800 truncate">{u.full_name || '—'}</p>
                  {(u.is_super_admin || u.role === 'super_admin') && (
                    <Crown className="w-3.5 h-3.5 text-purple-500" />
                  )}
                  {u.id === currentUser?.id && (
                    <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 h-4 px-1.5">ΕΓΩ</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>

              {/* Role badge */}
              <Badge className={`text-xs border shrink-0 ${ROLE_COLORS[u.role] || ROLE_COLORS.user}`}>
                {ROLE_LABELS[u.role] || u.role}
              </Badge>

              {/* Controls - only for super admin */}
              {superAdmin && u.id !== currentUser?.id && (
                <>
                  <Select value={u.role || 'employee'} onValueChange={v => handleRoleChange(u.id, v)}>
                    <SelectTrigger className="w-32 h-8 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2 shrink-0">
                    <Crown className="w-3.5 h-3.5 text-purple-400" />
                    <Switch
                      checked={!!u.is_super_admin}
                      onCheckedChange={v => handleSuperAdminToggle(u, v)}
                      className="scale-90"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <Switch
                      checked={u.is_active !== false}
                      onCheckedChange={v => handleActiveToggle(u, v)}
                      className="scale-90"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Πρόσκληση Χρήστη
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Email</Label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-500">Ρόλος</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'super_admin').map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Ο Super Admin ρόλος ανατίθεται χειροκίνητα μετά την εγγραφή.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Ακύρωση</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail || inviting} className="font-bold">
              {inviting ? 'Αποστολή...' : 'Αποστολή Πρόσκλησης'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}