import type { DefinitionModel } from './model';
import { definitionModelToBoundaryReportModels } from './report_model';
import type { ReportModel, ReportRowStatus } from './report_model';

export type ReportStatusSummary = Record<ReportRowStatus, number>;
export type ReportStatusSummaryLevel = 'ok' | 'warning' | 'rejected';

export function createEmptyReportStatusSummary(): ReportStatusSummary {
  return {
    ok: 0,
    warning: 0,
    rejected: 0,
    info: 0
  };
}

export function summarizeReportModelStatuses(report: ReportModel): ReportStatusSummary {
  const summary = createEmptyReportStatusSummary();

  for (const section of report.sections) {
    for (const row of section.rows) {
      if (row.status !== undefined) {
        summary[row.status] += 1;
      }
    }
  }

  return summary;
}

export function summarizeReportModelsStatuses(reports: ReportModel[]): ReportStatusSummary {
  const summary = createEmptyReportStatusSummary();

  for (const report of reports) {
    const reportSummary = summarizeReportModelStatuses(report);
    summary.ok += reportSummary.ok;
    summary.warning += reportSummary.warning;
    summary.rejected += reportSummary.rejected;
    summary.info += reportSummary.info;
  }

  return summary;
}

export function selectReportStatusSummaryLevel(summary: ReportStatusSummary): ReportStatusSummaryLevel {
  if (summary.rejected > 0) {
    return 'rejected';
  }

  if (summary.warning > 0) {
    return 'warning';
  }

  return 'ok';
}

export function formatReportStatusSummaryPlainText(summary: ReportStatusSummary): string {
  return [
    `ok: ${summary.ok}`,
    `warning: ${summary.warning}`,
    `rejected: ${summary.rejected}`,
    `info: ${summary.info}`
  ].join('\n');
}

export function definitionModelToBoundaryReportStatusSummary(
  model: DefinitionModel
): ReportStatusSummary {
  return summarizeReportModelsStatuses(definitionModelToBoundaryReportModels(model));
}

export function definitionModelToBoundaryReportStatusSummaryPlainText(model: DefinitionModel): string {
  return formatReportStatusSummaryPlainText(definitionModelToBoundaryReportStatusSummary(model));
}

export function definitionModelToBoundaryReportStatusLevel(
  model: DefinitionModel
): ReportStatusSummaryLevel {
  return selectReportStatusSummaryLevel(definitionModelToBoundaryReportStatusSummary(model));
}
