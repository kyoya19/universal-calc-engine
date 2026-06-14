import type { DefinitionModel } from './model';
import {
  definitionModelToBoundaryReportStatusSummary,
  formatReportStatusSummaryPlainText,
  selectReportStatusSummaryLevel
} from './report_status_summary';
import type { ReportStatusSummary, ReportStatusSummaryLevel } from './report_status_summary';

export type ReportStatusOverview = {
  summary: ReportStatusSummary;
  level: ReportStatusSummaryLevel;
  plainText: string;
};

export function toReportStatusOverview(summary: ReportStatusSummary): ReportStatusOverview {
  return {
    summary,
    level: selectReportStatusSummaryLevel(summary),
    plainText: formatReportStatusSummaryPlainText(summary)
  };
}

export function definitionModelToBoundaryReportStatusOverview(model: DefinitionModel): ReportStatusOverview {
  return toReportStatusOverview(definitionModelToBoundaryReportStatusSummary(model));
}
