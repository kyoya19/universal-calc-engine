import { describe, expect, it } from 'vitest';
import type { TransitionProbabilityAuditResult } from '../src/model';
import {
  formatReportModelPlainText,
  transitionProbabilityAuditResultToReportModel
} from '../src/report_model';

describe('transitionProbabilityAuditResultToReportModel', () => {
  it('converts audit rows into a UI-consumable report model', () => {
    const invalidRow = {
      stateId: 'start',
      transitionCount: 2,
      probabilityTotal: 0.8,
      deviationFromOne: -0.19999999999999996,
      terminal: false,
      valid: false
    };
    const audit: TransitionProbabilityAuditResult = {
      valid: false,
      rows: [invalidRow],
      invalidRows: [invalidRow]
    };

    const report = transitionProbabilityAuditResultToReportModel(audit);

    expect(report.kind).toBe('transition_probability_audit');
    expect(report.title).toBe('Transition Probability Audit');
    expect(report.sections.map((section) => section.id)).toEqual(['summary', 'rows']);

    const rows = report.sections.flatMap((section) => section.rows);
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'valid',
        plainText: 'valid: false',
        status: 'rejected'
      })
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'invalidRowCount',
        plainText: 'invalidRowCount: 1',
        status: 'rejected'
      })
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'row-0',
        label: 'start',
        status: 'rejected',
        metadata: expect.objectContaining({
          stateId: 'start',
          probabilityTotal: 0.8,
          valid: false
        })
      })
    );
  });

  it('formats the report into plain text', () => {
    const audit: TransitionProbabilityAuditResult = {
      valid: true,
      invalidRows: [],
      rows: [
        {
          stateId: 'start',
          transitionCount: 1,
          probabilityTotal: 1,
          deviationFromOne: 0,
          terminal: false,
          valid: true
        }
      ]
    };

    const text = formatReportModelPlainText(
      transitionProbabilityAuditResultToReportModel(audit)
    );

    expect(text).toContain('Transition Probability Audit');
    expect(text).toContain('valid: true');
    expect(text).toContain('stateId: start');
  });
});
