import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
  { key: 'category', label: 'Category', type: 'badge' },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'due_date', label: 'Due Date', type: 'date' },
];

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
  const qc = useQueryClient();

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => base44.entities.ServiceTicket.list('-created_date'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('name'),
  });

    // Filter customers by tax ID
  const filteredCustomers = searchTaxId
    ? customers.filter(c => c.tax_id && c.tax_id.includes(searchTaxId))
    : [];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceTicket.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceTicket.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });

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

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const criticalCount = tickets.filter(t => t.priority === 'critical').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Tickets"
        subtitle={`${tickets.length} tickets total · ${openCount} open`}
        actionLabel="New Ticket"
        onAction={openNew}
      />

      {/* Summary Badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All', value: 'all', count: tickets.length },
          { label: 'Open', value: 'open', count: openCount },
          { label: 'In Progress', value: 'in_progress', count: inProgressCount },
          { label: 'Waiting', value: 'waiting', count: tickets.filter(t => t.status === 'waiting').length },
          { label: 'Closed', value: 'closed', count: tickets.filter(t => t.status === 'closed').length },
        ].map(({ label, value, count }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              statusFilter === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            {label} <span className="ml-1 opacity-70">{count}</span>
          </button>
        ))}
        {criticalCount > 0 && (
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
            🔴 {criticalCount} Critical
          </span>
        )}
      </div>

      <DataTable columns={columns} data={filteredTickets} onRowClick={openEdit} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? `Edit Ticket ${form.ticket_number}` : 'New Ticket'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ticket #</Label>
                <Input value={form.ticket_number} onChange={e => set('ticket_number', e.target.value)} placeholder="TKT-0001" />
              </div>
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => set('title', e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                              <div className="relative">
                <Input 
                  placeholder="Αναζήτηση με ΑΦΜ..." 
                  value={searchTaxId}
                  onChange={(e) => setSearchTaxId(e.target.value)}
                />
                {filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setForm({ ...form, customer: c.name });
                          setSearchTaxId('');
                        }}
                      >
                        <div className="font-medium">{c.name}</div>
                        <div className="text-sm text-gray-500">ΑΦΜ: {c.tax_id}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                <Select value={form.customer || ''} onValueChange={v => set('customer', v)}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned To</Label>
                <Input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="Agent name or email" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Phone</Label>
                <Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Resolution Notes</Label>
                <Textarea value={form.resolution_notes} onChange={e => set('resolution_notes', e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Internal Notes</Label>
                <Textarea value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} rows={2} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Άκυρο</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Αποθήκευση...' : 'Αποθήκευση'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
