import type { DefinitionModel } from './model';
import {
  definitionModelToBoundaryReportModels,
  formatReportModelPlainText
} from './report_model';
import type { ReportModel } from './report_model';

const REPORT_PLAIN_TEXT_SEPARATOR = '\n\n---\n\n';

export function formatReportModelsPlainText(reports: ReportModel[]): string {
  return reports.map((report) => formatReportModelPlainText(report)).join(REPORT_PLAIN_TEXT_SEPARATOR);
}

export function definitionModelToBoundaryReportPlainText(model: DefinitionModel): string {
  return formatReportModelsPlainText(definitionModelToBoundaryReportModels(model));
}
