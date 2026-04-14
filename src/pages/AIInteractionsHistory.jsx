import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { Search, Activity } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function AIInteractionsHistory() {
  const { user, isLoadingAuth } = useAuth();
  const [searchUser, setSearchUser] = useState('');
  const [filterSource, setFilterSource] = useState('all');

  // Check if super admin
  const isSuperAdmin = user?.role === 'super_admin' || user?.is_super_admin;

  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ['ai_interactions', searchUser, filterSource],
    queryFn: async () => {
      const all = await base44.entities.AIInteraction.list('-created_date', 100);
      
      let filtered = all;
      
      // Filter by user if not super admin
      if (!isSuperAdmin && user?.email) {
        filtered = filtered.filter(i => i.user_identifier === user.email);
      }
      
      // Filter by search
      if (searchUser) {
        filtered = filtered.filter(i => 
          i.user_identifier?.toLowerCase().includes(searchUser.toLowerCase())
        );
      }

      // Filter by source
      if (filterSource !== 'all') {
        filtered = filtered.filter(i => i.source === filterSource);
      }

      return filtered;
    },
    enabled: Boolean(isSuperAdmin),
  });

  const sourceColors = {
    app: 'bg-blue-100 text-blue-800',
    telegram: 'bg-purple-100 text-purple-800',
    api: 'bg-green-100 text-green-800'
  };

  if (isLoadingAuth || !user) return null;

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Δεν έχεις πρόσβαση</CardTitle>
            <CardDescription>Μόνο super admin μπορεί να δει το ιστορικό όλων των users</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Ιστορικό AI Αλληλεπιδράσεων</h1>
        <p className="text-slate-500 mt-1">Όλες οι αλληλεπιδράσεις με το AI σύστημα</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-60">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Αναζήτηση κατά email..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες οι πηγές</SelectItem>
            <SelectItem value="app">App</SelectItem>
            <SelectItem value="telegram">Telegram</SelectItem>
            <SelectItem value="api">API</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Σύνολο</CardDescription>
            <CardTitle className="text-2xl">{interactions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Επιτυχημένες</CardDescription>
            <CardTitle className="text-2xl">{interactions.filter(i => i.success).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Αποτυχημένες</CardDescription>
            <CardTitle className="text-2xl text-red-600">{interactions.filter(i => !i.success).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Μέσος χρόνος</CardDescription>
            <CardTitle className="text-2xl">
              {interactions.length > 0 
                ? Math.round(interactions.reduce((a, b) => a + (b.response_time_ms || 0), 0) / interactions.length) 
                : 0}ms
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="pt-6">Φόρτωση...</CardContent></Card>
        ) : interactions.length === 0 ? (
          <Card><CardContent className="pt-6 text-center text-muted-foreground">Δεν υπάρχουν αλληλεπιδράσεις</CardContent></Card>
        ) : (
          interactions.map((interaction) => (
            <Card key={interaction.id} className="hover:shadow-md transition">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-slate-400" />
                      <span className="font-mono text-sm text-slate-600">{interaction.user_identifier}</span>
                      <Badge variant="outline" className={sourceColors[interaction.source]}>
                        {interaction.source}
                      </Badge>
                      <Badge variant={interaction.success ? 'default' : 'destructive'}>
                        {interaction.success ? 'Επιτυχής' : 'Αποτυχία'}
                      </Badge>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-slate-900 mb-1">Ερώτηση:</p>
                      <p className="text-sm text-slate-700">{interaction.query}</p>
                    </div>

                    {interaction.response && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-slate-900 mb-1">Απάντηση:</p>
                        <p className="text-sm text-slate-700 line-clamp-2">{interaction.response}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{format(new Date(interaction.created_date), 'dd/MM/yyyy HH:mm:ss', { locale: el })}</span>
                      {interaction.response_time_ms && (
                        <span>{interaction.response_time_ms}ms</span>
                      )}
                      {interaction.tokens_used && (
                        <span>{interaction.tokens_used} tokens</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
