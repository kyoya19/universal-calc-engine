import { expect, it } from 'vitest';
import { formatDefinitionModelBoundaryRowsText as f } from '../src/rc_model_text';
import { boundaryReportDefinitionModel as m } from './boundary_report_fixture';

it('rt2', () => {
  expect(f(m).startsWith('rows:')).toBe(true);
});
