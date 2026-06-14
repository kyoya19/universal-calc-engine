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

  it('has a terminal target and unit transition', () => {
    expect(boundaryReportDefinitionModel.states[1]?.terminal).toBe(true);
    expect(boundaryReportDefinitionModel.transitions[0]?.probability).toBe(1);
  });
});
