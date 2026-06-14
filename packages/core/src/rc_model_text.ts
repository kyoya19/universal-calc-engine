import type { DefinitionModel } from './model';
import { countDefinitionModelBoundaryReportStatusRows } from './report_status_count_model';
import { formatRowCountPlainText } from './row_count_text';

export function formatDefinitionModelBoundaryRowsText(model: DefinitionModel): string {
  return formatRowCountPlainText(countDefinitionModelBoundaryReportStatusRows(model));
}
