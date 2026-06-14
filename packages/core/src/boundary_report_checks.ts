import type { DefinitionModel } from './model';
import { definitionModelToBoundaryReportDigest } from './boundary_report_digest';
import type { BoundaryReportDigest } from './boundary_report_digest';

export function isBoundaryReportDigestOk(digest: BoundaryReportDigest): boolean {
  return digest.statusOverview.level === 'ok';
}

export function definitionModelToBoundaryReportDigestIsOk(model: DefinitionModel): boolean {
  return isBoundaryReportDigestOk(definitionModelToBoundaryReportDigest(model));
}
