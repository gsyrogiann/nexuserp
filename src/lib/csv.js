import Papa from 'papaparse';

export function parseCSV(text) {
  if (!String(text || '').trim()) {
    return [];
  }

  const { data, errors } = Papa.parse(String(text || ''), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().replace(/^"|"$/g, '').toLowerCase(),
  });

  if (errors?.length) {
    throw new Error(`CSV parse error: ${errors[0].message}`);
  }

  return data;
}
