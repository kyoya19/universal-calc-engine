import { describe, expect, it } from 'vitest';
import {
  definitionModelToBoundaryReportPlainText,
  formatReportModelsPlainText
} from '../src/boundary_report_text';
import type { ReportModel } from '../src/report_model';

describe('boundary report text helpers', () => {
  it('formats an empty report model list as empty text', () => {
    expect(formatReportModelsPlainText([])).toBe('');
  });

  it('formats a single report model without a separator', () => {
    const report: ReportModel = {
      kind: 'one',
      title: 'One',
      sections: [{ id: 'summary', title: 'Summary', rows: [{ id: 'a', label: 'a', plainText: 'a: 1' }] }]
    };

    expect(formatReportModelsPlainText([report])).toBe('One\n\n## Summary\na: 1');
  });

  it('formats a title-only report model without section padding', () => {
    const report: ReportModel = {
      kind: 'empty',
      title: 'Empty Report',
      sections: []
    };

    expect(formatReportModelsPlainText([report])).toBe('Empty Report');
  });

  it('formats an empty section without row padding', () => {
    const report: ReportModel = {
      kind: 'empty_section',
      title: 'Empty Section Report',
      sections: [{ id: 'summary', title: 'Summary', rows: [] }]
    };

    expect(formatReportModelsPlainText([report])).toBe('Empty Section Report\n\n## Summary');
  });

  it('formats multiple report models with a stable separator', () => {
    const reports: ReportModel[] = [
      {
        kind: 'one',
        title: 'One',
        sections: [{ id: 'summary', title: 'Summary', rows: [{ id: 'a', label: 'a', plainText: 'a: 1' }] }]
      },
      {
        kind: 'two',
        title: 'Two',
        sections: [{ id: 'summary', title: 'Summary', rows: [{ id: 'b', label: 'b', plainText: 'b: 2' }] }]
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe('One\n\n## Summary\na: 1\n\n---\n\nTwo\n\n## Summary\nb: 2');
  });

  it('formats the current boundary reports directly from a definition model', () => {
    const text = definitionModelToBoundaryReportPlainText({
      startState: 'start',
      states: [
        { id: 'start', properties: { step: 0 } },
        { id: 'state:{step=1}', properties: { step: 1 } }
      ],
      transitions: [
        {
          from: 'start',
          to: 'state:{step=1}',
          probability: 1,
          effects: [{ type: 'set_property', property: 'step', value: 1 }]
        }
      ]
    });

    expect(text).toContain('State Graph Summary');
    expect(text).toContain('Transition Probability Audit');
    expect(text).toContain('Generated Target Comparison Report');
    expect(text).toContain('---');
  });
});
