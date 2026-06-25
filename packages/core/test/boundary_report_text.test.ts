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

  it('formats title-only report models with a stable separator', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_title_only',
        title: 'First Title',
        sections: []
      },
      {
        kind: 'second_title_only',
        title: 'Second Title',
        sections: []
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe('First Title\n\n---\n\nSecond Title');
  });

  it('formats title-only and section reports with a stable separator', () => {
    const reports: ReportModel[] = [
      {
        kind: 'title_only',
        title: 'Title Only',
        sections: []
      },
      {
        kind: 'with_section',
        title: 'With Section',
        sections: [{ id: 'summary', title: 'Summary', rows: [{ id: 'row', label: 'row', plainText: 'row: 1' }] }]
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe('Title Only\n\n---\n\nWith Section\n\n## Summary\nrow: 1');
  });

  it('formats section and title-only reports with a stable separator', () => {
    const reports: ReportModel[] = [
      {
        kind: 'with_section',
        title: 'With Section',
        sections: [{ id: 'summary', title: 'Summary', rows: [{ id: 'row', label: 'row', plainText: 'row: 1' }] }]
      },
      {
        kind: 'title_only',
        title: 'Title Only',
        sections: []
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe('With Section\n\n## Summary\nrow: 1\n\n---\n\nTitle Only');
  });

  it('formats an empty section without row padding', () => {
    const report: ReportModel = {
      kind: 'empty_section',
      title: 'Empty Section Report',
      sections: [{ id: 'summary', title: 'Summary', rows: [] }]
    };

    expect(formatReportModelsPlainText([report])).toBe('Empty Section Report\n\n## Summary');
  });

  it('formats adjacent empty sections with a stable section gap', () => {
    const report: ReportModel = {
      kind: 'adjacent_empty_sections',
      title: 'Empty Pair',
      sections: [
        { id: 'first', title: 'First', rows: [] },
        { id: 'second', title: 'Second', rows: [] }
      ]
    };

    expect(formatReportModelsPlainText([report])).toBe('Empty Pair\n\n## First\n\n## Second');
  });

  it('formats empty and row sections with a stable section gap', () => {
    const report: ReportModel = {
      kind: 'empty_then_rows',
      title: 'Mixed Sections',
      sections: [
        { id: 'empty', title: 'Empty', rows: [] },
        { id: 'summary', title: 'Summary', rows: [{ id: 'row', label: 'row', plainText: 'row: 1' }] }
      ]
    };

    expect(formatReportModelsPlainText([report])).toBe('Mixed Sections\n\n## Empty\n\n## Summary\nrow: 1');
  });

  it('formats row and empty sections with a stable section gap', () => {
    const report: ReportModel = {
      kind: 'rows_then_empty',
      title: 'Row Then Empty',
      sections: [
        { id: 'summary', title: 'Summary', rows: [{ id: 'row', label: 'row', plainText: 'row: 1' }] },
        { id: 'empty', title: 'Empty', rows: [] }
      ]
    };

    expect(formatReportModelsPlainText([report])).toBe('Row Then Empty\n\n## Summary\nrow: 1\n\n## Empty');
  });

  it('formats multiple row sections with a stable section gap', () => {
    const report: ReportModel = {
      kind: 'multiple_row_sections',
      title: 'Multiple Rows',
      sections: [
        { id: 'first', title: 'First', rows: [{ id: 'first-row', label: 'first', plainText: 'first: 1' }] },
        { id: 'second', title: 'Second', rows: [{ id: 'second-row', label: 'second', plainText: 'second: 2' }] }
      ]
    };

    expect(formatReportModelsPlainText([report])).toBe('Multiple Rows\n\n## First\nfirst: 1\n\n## Second\nsecond: 2');
  });

  it('formats section rows directly under the section title', () => {
    const report: ReportModel = {
      kind: 'section_row_gap',
      title: 'Gap Report',
      sections: [
        {
          id: 'summary',
          title: 'Summary',
          rows: [
            { id: 'first', label: 'first', plainText: 'first: 1' },
            { id: 'second', label: 'second', plainText: 'second: 2' }
          ]
        }
      ]
    };

    expect(formatReportModelsPlainText([report])).toBe('Gap Report\n\n## Summary\nfirst: 1\nsecond: 2');
  });

  it('formats empty-section and title-only reports with a stable separator', () => {
    const reports: ReportModel[] = [
      {
        kind: 'empty_section',
        title: 'Empty Section',
        sections: [{ id: 'summary', title: 'Summary', rows: [] }]
      },
      {
        kind: 'title_only',
        title: 'Title Only',
        sections: []
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe('Empty Section\n\n## Summary\n\n---\n\nTitle Only');
  });

  it('formats empty-section report models with a stable separator', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_empty_section',
        title: 'First Empty',
        sections: [{ id: 'summary', title: 'Summary', rows: [] }]
      },
      {
        kind: 'second_empty_section',
        title: 'Second Empty',
        sections: [{ id: 'details', title: 'Details', rows: [] }]
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe('First Empty\n\n## Summary\n\n---\n\nSecond Empty\n\n## Details');
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

  it('formats three report models with stable separators', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_title_only',
        title: 'First Title',
        sections: []
      },
      {
        kind: 'middle_section',
        title: 'Middle Section',
        sections: [{ id: 'summary', title: 'Summary', rows: [{ id: 'row', label: 'row', plainText: 'row: 1' }] }]
      },
      {
        kind: 'last_title_only',
        title: 'Last Title',
        sections: []
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe(
      'First Title\n\n---\n\nMiddle Section\n\n## Summary\nrow: 1\n\n---\n\nLast Title'
    );
  });

  it('formats section-title-section report models with stable separators', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_section',
        title: 'First Section',
        sections: [{ id: 'summary', title: 'Summary', rows: [{ id: 'first-row', label: 'first', plainText: 'first: 1' }] }]
      },
      {
        kind: 'middle_title_only',
        title: 'Middle Title',
        sections: []
      },
      {
        kind: 'last_section',
        title: 'Last Section',
        sections: [{ id: 'details', title: 'Details', rows: [{ id: 'last-row', label: 'last', plainText: 'last: 2' }] }]
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe(
      'First Section\n\n## Summary\nfirst: 1\n\n---\n\nMiddle Title\n\n---\n\nLast Section\n\n## Details\nlast: 2'
    );
  });

  it('formats title-empty-title report models with stable separators', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_title_only',
        title: 'First Title',
        sections: []
      },
      {
        kind: 'middle_empty_section',
        title: 'Middle Empty',
        sections: [{ id: 'summary', title: 'Summary', rows: [] }]
      },
      {
        kind: 'last_title_only',
        title: 'Last Title',
        sections: []
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe(
      'First Title\n\n---\n\nMiddle Empty\n\n## Summary\n\n---\n\nLast Title'
    );
  });

  it('formats title-title-empty report models with stable separators', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_title_only',
        title: 'First Title',
        sections: []
      },
      {
        kind: 'middle_title_only',
        title: 'Middle Title',
        sections: []
      },
      {
        kind: 'last_empty_section',
        title: 'Last Empty',
        sections: [{ id: 'summary', title: 'Summary', rows: [] }]
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe(
      'First Title\n\n---\n\nMiddle Title\n\n---\n\nLast Empty\n\n## Summary'
    );
  });

  it('formats title-empty-empty report models with stable separators', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_title_only',
        title: 'First Title',
        sections: []
      },
      {
        kind: 'middle_empty_section',
        title: 'Middle Empty',
        sections: [{ id: 'summary', title: 'Summary', rows: [] }]
      },
      {
        kind: 'last_empty_section',
        title: 'Last Empty',
        sections: [{ id: 'details', title: 'Details', rows: [] }]
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe(
      'First Title\n\n---\n\nMiddle Empty\n\n## Summary\n\n---\n\nLast Empty\n\n## Details'
    );
  });

  it('formats empty-title-empty report models with stable separators', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_empty_section',
        title: 'First Empty',
        sections: [{ id: 'summary', title: 'Summary', rows: [] }]
      },
      {
        kind: 'middle_title_only',
        title: 'Middle Title',
        sections: []
      },
      {
        kind: 'last_empty_section',
        title: 'Last Empty',
        sections: [{ id: 'details', title: 'Details', rows: [] }]
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe(
      'First Empty\n\n## Summary\n\n---\n\nMiddle Title\n\n---\n\nLast Empty\n\n## Details'
    );
  });

  it('formats empty-empty-title report models with stable separators', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_empty_section',
        title: 'First Empty',
        sections: [{ id: 'summary', title: 'Summary', rows: [] }]
      },
      {
        kind: 'middle_empty_section',
        title: 'Middle Empty',
        sections: [{ id: 'details', title: 'Details', rows: [] }]
      },
      {
        kind: 'last_title_only',
        title: 'Last Title',
        sections: []
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe(
      'First Empty\n\n## Summary\n\n---\n\nMiddle Empty\n\n## Details\n\n---\n\nLast Title'
    );
  });

  it('formats three empty-section report models with stable separators', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_empty_section',
        title: 'First Empty',
        sections: [{ id: 'summary', title: 'Summary', rows: [] }]
      },
      {
        kind: 'middle_empty_section',
        title: 'Middle Empty',
        sections: [{ id: 'details', title: 'Details', rows: [] }]
      },
      {
        kind: 'last_empty_section',
        title: 'Last Empty',
        sections: [{ id: 'tail', title: 'Tail', rows: [] }]
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe(
      'First Empty\n\n## Summary\n\n---\n\nMiddle Empty\n\n## Details\n\n---\n\nLast Empty\n\n## Tail'
    );
  });

  it('formats multiple report models with multiple section gaps and a stable separator', () => {
    const reports: ReportModel[] = [
      {
        kind: 'first_multi_section',
        title: 'First Report',
        sections: [
          { id: 'empty', title: 'Empty', rows: [] },
          { id: 'summary', title: 'Summary', rows: [{ id: 'a', label: 'a', plainText: 'a: 1' }] }
        ]
      },
      {
        kind: 'second_multi_section',
        title: 'Second Report',
        sections: [
          { id: 'details', title: 'Details', rows: [{ id: 'b', label: 'b', plainText: 'b: 2' }] },
          { id: 'tail', title: 'Tail', rows: [{ id: 'tail', label: 'tail', plainText: 'tail: 3' }] }
        ]
      }
    ];

    expect(formatReportModelsPlainText(reports)).toBe(
      'First Report\n\n## Empty\n\n## Summary\na: 1\n\n---\n\nSecond Report\n\n## Details\nb: 2\n\n## Tail\ntail: 3'
    );
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
