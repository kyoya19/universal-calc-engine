import { expect, it } from 'vitest';
import { definitionModelToBoundaryReportStatusSummary } from '../src/report_status_summary';
import { countReportStatusSummaryRows } from '../src/report_status_count';
import { boundaryReportDefinitionModel } from './boundary_report_fixture';

it('counts boundary status rows', () => {
  const summary = definitionModelToBoundaryReportStatusSummary(boundaryReportDefinitionModel);
  expect(countReportStatusSummaryRows(summary)).toBeGreaterThan(0);
});
