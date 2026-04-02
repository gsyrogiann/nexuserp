import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers'; 
import { listCustomers } from '@/lib/directoryQueries';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trash2, Archive } from 'lucide-react';
 
const STATUS_OPTIONS = ['open', 'in_progress', 'waiting', 'closed'];
const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'critical'];
const CATEGORY_OPTIONS = ['technical', 'commercial', 'complaint', 'other'];
 
const priorityColors = {
  low: 'bg-gray-100 text-gray-600 border-gray-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};
 
const statusColors = {
  open: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  waiting: 'bg-amber-100 text-amber-700 border-amber-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
};
 
const emptyForm = {
  ticket_number: '',
  title: '',
  description: '',
  customer: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  status: 'open',
  priority: 'normal',
  category: 'technical',
  assigned_to: '',
  due_date: '',
  resolution_notes: '',
  internal_notes: '',
};
 
export default function Tickets() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTaxId, setSearchTaxId] = useState('');
  const [dailyArchive, setDailyArchive] = useState([]);
  const qc = useQueryClient();
 
  // Fetch Tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => fetchList(base44.entities.ServiceTicket, { sort: '-created_date' }),
  });
 
  // Fetch Customers for Search
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => listCustomers(),
  });
 
  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceTicket.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
 
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceTicket.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
 
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceTicket.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
 
  const handleDelete = async (e, row) => {
    e.stopPropagation();
    if (window.confirm(`Οριστική διαγραφή του ${row.ticket_number};`)) {
      const archiveEntry = {
        ...row,
        archivedAt: new Date().toLocaleTimeString('el-GR'),
        reason: 'Manual Delete'
      };
      setDailyArchive(prev => [archiveEntry, ...prev]);
      await deleteMutation.mutateAsync(row.id);
    }
  };
 
  const columns = [
    { key: 'ticket_number', label: '#' },
    { key: 'title', label: 'Title' },
    { key: 'customer', label: 'Customer' },
    {
      key: 'priority',
      label: 'Priority',
      render: (val) => (
        <Badge variant="outline" className={cn('text-[11px] font-medium border', priorityColors[val] || '')}>
          {val || '—'}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge variant="outline" className={cn('text-[11px] font-medium border', statusColors[val] || '')}>
          {(val || '—').replace(/_/g, ' ')}
        </Badge>
      ),
    },
    { key: 'assigned_to', label: 'Assigned' },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-red-600"
          onClick={(e) => handleDelete(e, row)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )
    }
  ];
 
  const filteredCustomers = searchTaxId
    ? customers.filter(c => c.tax_id && c.tax_id.includes(searchTaxId))
    : [];
 
  const openNew = () => {
    const count = tickets.length + 1;
    setForm({ ...emptyForm, ticket_number: `TKT-${String(count).padStart(4, '0')}` });
    setDialogOpen(true);
  };
 
  const openEdit = (row) => {
    setForm({ ...emptyForm, ...row });
    setDialogOpen(true);
  };
 
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.id) {
      await updateMutation.mutateAsync({ id: form.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    setDialogOpen(false);
  };
 
  const filteredTickets = statusFilter === 'all'
    ? tickets
    : tickets.filter(t => t.status === statusFilter);
 
  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
 
  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Service Tickets"
        subtitle={`${tickets.length} tickets total · ${tickets.filter(t => t.status === 'open').length} open`}
        actionLabel="New Ticket"
        onAction={openNew}
      />
 
      <div className="flex flex-wrap gap-2">
        {['all', 'open', 'in_progress', 'waiting', 'closed'].map((val) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              statusFilter === val
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            {val.charAt(0).toUpperCase() + val.slice(1).replace('_', ' ')}
            <span className="ml-1 opacity-70">
              {val === 'all' ? tickets.length : tickets.filter(t => t.status === val).length}
            </span>
          </button>
        ))}
      </div>
 
      <DataTable columns={columns} data={filteredTickets} onRowClick={openEdit} />
 
      {/* ΑΡΧΕΙΟ ΗΜΕΡΑ */}
      <div className="mt-12 space-y-4">
        <div className="flex items-center gap-2 text-slate-800">
          <Archive className="w-5 h-5" />
          <h2 className="text-lg font-bold tracking-tight">Αρχείο Ημέρας & Logs Διαγραφών</h2>
        </div>
 
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Ticket</th>
                <th className="px-6 py-3">Πελάτης</th>
                <th className="px-6 py-3">Κατάσταση</th>
                <th className="px-6 py-3">Ώρα Διαγραφής</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dailyArchive.length > 0 ? (
                dailyArchive.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.ticket_number}</td>
                    <td className="px-6 py-4 text-slate-600">{item.customer}</td>
                    <td className="px-6 py-4">
                      <Badge className="bg-red-50 text-red-700 border-red-100 text-[10px]">ΔΙΕΓΡΑΜΜΕΝΟ</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{item.archivedAt}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    Το αρχείο ημέρας είναι κενό.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
 
      {/* EDIT/NEW DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? `Edit Ticket ${form.ticket_number}` : 'New Ticket'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ticket #</Label>
                <Input value={form.ticket_number} onChange={e => set('ticket_number', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => set('title', e.target.value)} required />
              </div>
            </div>
 
            <div className="space-y-1.5">
              <Label>Customer Search (ΑΦΜ)</Label>
              <div className="relative">
                <Input
                  placeholder="Αναζήτηση με ΑΦΜ..."
                  value={searchTaxId}
                  onChange={(e) => setSearchTaxId(e.target.value)}
                />
                {filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-auto">
                    {filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                        onClick={() => {
                          setForm({ ...form, customer: c.name });
                          setSearchTaxId('');
                        }}
                      >
                        <span className="font-bold">{c.name}</span> — {c.tax_id}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
 
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => set('priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => set('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
 
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
            </div>
 
            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Άκυρο</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Αποθήκευση...' : 'Αποθήκευση'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
