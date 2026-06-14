import { expect, it } from 'vitest';
import { definitionModelToBoundaryReportStatusIsOk } from '../src';
import { boundaryReportDefinitionModel } from './boundary_report_fixture';

it('sok3', () => {
  expect(definitionModelToBoundaryReportStatusIsOk(boundaryReportDefinitionModel)).toBe(true);
});
