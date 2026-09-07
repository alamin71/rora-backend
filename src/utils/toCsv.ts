// Minimal array-of-objects -> CSV string converter — no dependency needed for
// the flat, admin-table shapes this project exports (payouts, calls).
const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str =
    value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsv = (
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[]
): string => {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(row[c.key])).join(',')
  );
  return [header, ...lines].join('\n');
};

export default toCsv;
