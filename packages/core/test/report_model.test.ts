import { describe, expect, test } from 'vitest';
import {
  buildGeneratedTargetComparisonReport,
  formatReportModelPlainText,
  generatedTargetComparisonReportToReportModel,
  solveExpectedRewardWithGeneratedTargetGate,
  toOutputResult
} from '../src';
import { positionStateId, representativeSugorokuModel } from './fixtures/sugoroku';

describe('UI consumable report model', () => {
  test('converts a generated-target comparison report into stable sections', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
    const comparisonReport = buildGeneratedTargetComparisonReport(result.graph);
    const reportModel = generatedTargetComparisonReportToReportModel(comparisonReport);

    expect(reportModel.kind).toBe('generated_target_comparison');
    expect(reportModel.title).toBe('Generated Target Comparison Report');
    expect(reportModel.sections.map((section) => section.id)).toEqual(['summary', 'rows']);
    expect(reportModel.sections[0]!.rows.map((row) => row.id)).toEqual([
      'edgeCount',
      'matchCount',
      'missingGeneratedTargetCount',
      'explicitGeneratedMismatchCount'
    ]);
    expect(reportModel.sections[1]!.rows).toHaveLength(comparisonReport.rows.length);
  });

  test('formats a report model as plain text without reparsing metadata', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
    const comparisonReport = buildGeneratedTargetComparisonReport(result.graph);
    const reportModel = generatedTargetComparisonReportToReportModel(comparisonReport);

    expect(formatReportModelPlainText(reportModel)).toBe(
      [
        'Generated Target Comparison Report',
        '',
        '## Summary',
        `edgeCount: ${comparisonReport.edgeCount}`,
        `matchCount: ${comparisonReport.matchCount}`,
        'missingGeneratedTargetCount: 0',
        'explicitGeneratedMismatchCount: 0',
        '',
        '## Rows',
        ...comparisonReport.rows.map(
          (row, index) =>
            `row ${index}: from: ${row.from} explicitTo: ${row.explicitTo} generatedTo: ${row.generatedTo ?? '<missing>'} status: ${row.status}`
        )
      ].join('\n')
    );
  });

  test('preserves generated-target comparison metadata without reparsing text', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
    const comparisonReport = buildGeneratedTargetComparisonReport(result.graph);
    const reportModel = generatedTargetComparisonReportToReportModel(comparisonReport);
    const firstEdgeRow = reportModel.sections[1]!.rows[0]!;

    expect(firstEdgeRow).toMatchObject({
      id: 'row-0',
      label: 'row 0',
      status: 'ok',
      className: 'generated-target-comparison-row generated-target-comparison-row--match',
      metadata: {
        from: positionStateId(0),
        explicitTo: positionStateId(1),
        generatedTo: positionStateId(1),
        generatedToMissing: false,
        comparisonStatus: 'match'
      }
    });
  });

  test('marks missing generated targets as rejected while preserving explicit target metadata', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const comparisonReport = buildGeneratedTargetComparisonReport(result.graph);
    const reportModel = generatedTargetComparisonReportToReportModel(comparisonReport);
    const summaryRows = reportModel.sections[0]!.rows;
    const firstEdgeRow = reportModel.sections[1]!.rows[0]!;

    expect(summaryRows.find((row) => row.id === 'missingGeneratedTargetCount')).toMatchObject({
      plainText: 'missingGeneratedTargetCount: 1',
      status: 'rejected',
      metadata: { value: 1 }
    });
    expect(firstEdgeRow).toMatchObject({
      status: 'rejected',
      className: 'generated-target-comparison-row generated-target-comparison-row--missing_generated_target',
      metadata: {
        from: positionStateId(0),
        explicitTo: positionStateId(1),
        generatedTo: undefined,
        generatedToMissing: true,
        comparisonStatus: 'missing_generated_target'
      }
    });
    expect(firstEdgeRow.plainText).toContain('generatedTo: <missing>');
  });

  test('does not change generated-target solver gate behavior or baseline values', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);

    expect(result.accepted).toBe(true);
    if (!result.accepted) {
      throw new Error('Expected generated-target gate to accept the representative Sugoroku model');
    }

    const output = toOutputResult(representativeSugorokuModel, result.solvedModel);

    expect(output.expectedRewardByState[positionStateId(0)]).toBe(2.25);
    expect(output.expectedRewardByState[positionStateId(1)]).toBe(1.5);
    expect(output.expectedRewardByState[positionStateId(2)]).toBe(1);
    expect(output.expectedRewardByState[positionStateId(3)]).toBe(0);
  });
});
