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

export function serializeReportStatusOverview(overview: ReportStatusOverview): ReportStatusOverview {
  return {
    ...overview,
    summary: { ...overview.summary }
  };
}

export function reportStatusOverviewToJson(overview: ReportStatusOverview): string {
  return JSON.stringify(serializeReportStatusOverview(overview));
}

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
