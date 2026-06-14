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

export function formatBoundaryReportCheckResultPlainText(
  result: BoundaryReportCheckResult
): string {
  return [`ok: ${result.ok}`, '', formatBoundaryReportDigestPlainText(result.digest)].join('\n');
}

export function definitionModelToBoundaryReportCheckResultPlainText(model: DefinitionModel): string {
  return formatBoundaryReportCheckResultPlainText(definitionModelToBoundaryReportCheckResult(model));
}
