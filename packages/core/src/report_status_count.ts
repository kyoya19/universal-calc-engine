import type { ReportStatusSummary } from './report_status_summary';

export function countReportStatusSummaryRows(summary: ReportStatusSummary): number {
  return summary.ok + summary.warning + summary.rejected + summary.info;
}
