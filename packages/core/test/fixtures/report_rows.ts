import type { ReportRow } from '../../src';

export function compactRows(rows: ReportRow[]) {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    plainText: row.plainText,
    status: row.status,
    metadata: row.metadata
  }));
}
