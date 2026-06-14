import { expect, it } from 'vitest';
import { boundaryReportDefinitionModel as m } from './boundary_report_fixture';

it('m731 fixture', () => {
  expect(m.states[1]?.terminal).toBe(true);
});
