import { expect, it } from 'vitest';
import { boundaryReportDefinitionModel as m } from './boundary_report_fixture';

it('m730 fixture', () => {
  expect(typeof m.startState).toBe('string');
});
