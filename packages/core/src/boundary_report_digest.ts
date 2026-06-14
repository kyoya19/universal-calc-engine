import type { DefinitionModel } from './model';
import { definitionModelToBoundaryReportModels } from './report_model';
import type { ReportModel } from './report_model';
import { formatReportModelsPlainText } from './boundary_report_text';
import { toReportStatusOverview } from './report_status_overview';
import type { ReportStatusOverview } from './report_status_overview';
import { summarizeReportModelsStatuses } from './report_status_summary';

export type BoundaryReportDigest = {
  reports: ReportModel[];
  reportText: string;
  statusOverview: ReportStatusOverview;
};

export function definitionModelToBoundaryReportDigest(model: DefinitionModel): BoundaryReportDigest {
  const reports = definitionModelToBoundaryReportModels(model);
  return {
    reports,
    reportText: formatReportModelsPlainText(reports),
    statusOverview: toReportStatusOverview(summarizeReportModelsStatuses(reports))
  };
}

export function formatBoundaryReportDigestPlainText(digest: BoundaryReportDigest): string {
  return [
    `statusLevel: ${digest.statusOverview.level}`,
    digest.statusOverview.plainText,
    '',
    '---',
    '',
    digest.reportText
  ].join('\n');
}

export function definitionModelToBoundaryReportDigestPlainText(model: DefinitionModel): string {
  return formatBoundaryReportDigestPlainText(definitionModelToBoundaryReportDigest(model));
}
