import { describe, expect, it } from 'vitest';
import { parseCSV } from '@/lib/csv';

describe('parseCSV', () => {
  it('parses quoted UTF-8 values correctly', () => {
    const result = parseCSV('name,tax_id,city\n"Παπαδόπουλος ΑΕ","123456789","Αθήνα"\n');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'Παπαδόπουλος ΑΕ',
      tax_id: '123456789',
      city: 'Αθήνα',
    });
  });

  it('returns an empty array for blank input', () => {
    expect(parseCSV('')).toEqual([]);
    expect(parseCSV('\n')).toEqual([]);
  });
});
