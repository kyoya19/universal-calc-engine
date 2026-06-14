import { expect, it } from 'vitest';
import { countDefinitionModelBoundaryReportStatusRows as c } from '../src/report_status_count_model';
import { boundaryReportDefinitionModel as m } from './boundary_report_fixture';

it('rcm', () => {
  expect(c(m)).toBeGreaterThan(0);
});
