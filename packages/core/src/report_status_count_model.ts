import type { DefinitionModel } from './model';
import { definitionModelToBoundaryReportStatusSummary } from './report_status_summary';
import { countReportStatusSummaryRows } from './report_status_count';

export function countDefinitionModelBoundaryReportStatusRows(model: DefinitionModel): number {
  return countReportStatusSummaryRows(definitionModelToBoundaryReportStatusSummary(model));
}
