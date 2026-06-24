import type { DefinitionModel } from './model';
import { definitionModelToBoundaryReportModels } from './report_model';
import type { ReportModel, ReportRow, ReportSection } from './report_model';
import { formatReportModelsPlainText } from './boundary_report_text';
import { toReportStatusOverview } from './report_status_overview';
import type { ReportStatusOverview } from './report_status_overview';
import { summarizeReportModelsStatuses } from './report_status_summary';

export type BoundaryReportDigest = {
  reports: ReportModel[];
  reportText: string;
  statusOverview: ReportStatusOverview;
};

function serializeBoundaryReportRow(row: ReportRow): ReportRow {
  if (row.metadata === undefined) {
    return { ...row };
  }

  return {
    ...row,
    metadata: { ...row.metadata }
  };
}

function serializeBoundaryReportSection(section: ReportSection): ReportSection {
  return {
    ...section,
    rows: section.rows.map(serializeBoundaryReportRow)
  };
}

function serializeBoundaryReportModel(report: ReportModel): ReportModel {
  return {
    ...report,
    sections: report.sections.map(serializeBoundaryReportSection)
  };
}

export function serializeBoundaryReportDigest(digest: BoundaryReportDigest): BoundaryReportDigest {
  return {
    reports: digest.reports.map(serializeBoundaryReportModel),
    reportText: digest.reportText,
    statusOverview: {
      ...digest.statusOverview,
      summary: { ...digest.statusOverview.summary }
    }
  };
}

export function boundaryReportDigestToJson(digest: BoundaryReportDigest): string {
  return JSON.stringify(serializeBoundaryReportDigest(digest));
}

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
