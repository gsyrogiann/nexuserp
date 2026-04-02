import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/apiHelpers';

export function listCustomers(options = {}) {
  return fetchList(base44.entities.Customer, {
    sort: 'name',
    ...options,
  });
}

export function listSuppliers(options = {}) {
  return fetchList(base44.entities.Supplier, {
    sort: 'name',
    ...options,
  });
}
