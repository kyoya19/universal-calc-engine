import type { DefinitionModel } from './model';
import {
  definitionModelToBoundaryReportDigest,
  formatBoundaryReportDigestPlainText
} from './boundary_report_digest';
import type { BoundaryReportDigest } from './boundary_report_digest';
import { isBoundaryReportDigestOk } from './boundary_report_checks';

export type BoundaryReportCheckResult = {
  digest: BoundaryReportDigest;
  ok: boolean;
};

export function boundaryReportDigestToCheckResult(
  digest: BoundaryReportDigest
): BoundaryReportCheckResult {
  return {
    digest,
    ok: isBoundaryReportDigestOk(digest)
  };
}

export function definitionModelToBoundaryReportCheckResult(
  model: DefinitionModel
): BoundaryReportCheckResult {
  return boundaryReportDigestToCheckResult(definitionModelToBoundaryReportDigest(model));
}

export function serializeBoundaryReportCheckResult(
  result: BoundaryReportCheckResult
): BoundaryReportCheckResult {
  return {
    digest: {
      reports: result.digest.reports.map((report) => ({
        ...report,
        sections: report.sections.map((section) => ({
          ...section,
          rows: section.rows.map((row) => ({
            ...row,
            ...(row.metadata === undefined ? {} : { metadata: { ...row.metadata } })
          }))
        }))
      })),
      reportText: result.digest.reportText,
      statusOverview: { ...result.digest.statusOverview }
    },
    ok: result.ok
  };
}

export function boundaryReportCheckResultToJson(result: BoundaryReportCheckResult): string {
  return JSON.stringify(serializeBoundaryReportCheckResult(result));
}

export function formatBoundaryReportCheckResultPlainText(
  result: BoundaryReportCheckResult
): string {
  return [`ok: ${result.ok}`, '', formatBoundaryReportDigestPlainText(result.digest)].join('\n');
}

export function definitionModelToBoundaryReportCheckResultPlainText(model: DefinitionModel): string {
  return formatBoundaryReportCheckResultPlainText(definitionModelToBoundaryReportCheckResult(model));
}
