import { countReportStatusSummaryRows } from './report_status_count';
import type { ReportStatusSummary } from './report_status_summary';
import { formatRowCountPlainText } from './row_count_text';

export function formatSummaryRowsText(summary: ReportStatusSummary): string {
  return formatRowCountPlainText(countReportStatusSummaryRows(summary));
}
