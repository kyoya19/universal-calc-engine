import { describe, expect, it } from 'vitest';
import { boundaryReportDefinitionModel } from './boundary_report_fixture';

describe('b fixture', () => {
  it('has a start state', () => {
    expect(boundaryReportDefinitionModel.startState).toBe('start');
  });

  it('has a minimal shape', () => {
    expect(boundaryReportDefinitionModel.states).toHaveLength(2);
    expect(boundaryReportDefinitionModel.transitions).toHaveLength(1);
  });
});
