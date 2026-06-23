import { describe, expect, test } from 'vitest';
import {
  buildGeneratedTargetComparisonReport,
  definitionModelToBoundaryReportDigest,
  evaluateModel,
  expandModel,
  formatGeneratedTargetSolverGateResultSummary,
  formatReportModelPlainText,
  generatedTargetComparisonReportToReportModel,
  generatedTargetSolverGateResultSummaryToReportModel,
  solveExpectedReward,
  solveExpectedRewardWithGeneratedTargetGate,
  summarizeGeneratedTargetSolverGateResult,
  toContributionResult,
  toOutputResult
} from '../src';
import type { DefinitionModel } from '../src';
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

  test('keeps missing generated-target diagnostics stable after JSON serialization', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const comparisonReport = buildGeneratedTargetComparisonReport(result.graph);
    const reportModel = generatedTargetComparisonReportToReportModel(comparisonReport);
    const serializedReportModel = JSON.parse(JSON.stringify(reportModel));
    const firstEdgeRow = serializedReportModel.sections[1]!.rows[0]!;

    expect(firstEdgeRow).toMatchObject({
      plainText: `row 0: from: ${positionStateId(0)} explicitTo: ${positionStateId(1)} generatedTo: <missing> status: missing_generated_target`,
      status: 'rejected',
      metadata: {
        from: positionStateId(0),
        explicitTo: positionStateId(1),
        generatedToMissing: true,
        comparisonStatus: 'missing_generated_target'
      }
    });
    expect(firstEdgeRow.metadata).not.toHaveProperty('generatedTo');
  });

  test('keeps explicit/generated mismatch diagnostics stable after JSON serialization', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });
    const comparisonReport = buildGeneratedTargetComparisonReport(result.graph);
    const reportModel = generatedTargetComparisonReportToReportModel(comparisonReport);
    const serializedReportModel = JSON.parse(JSON.stringify(reportModel));
    const summaryRows = serializedReportModel.sections[0]!.rows;
    const firstEdgeRow = serializedReportModel.sections[1]!.rows[0]!;

    expect(summaryRows.find((row: { id: string }) => row.id === 'explicitGeneratedMismatchCount')).toMatchObject({
      plainText: 'explicitGeneratedMismatchCount: 1',
      status: 'rejected',
      metadata: { value: 1 }
    });
    expect(firstEdgeRow).toMatchObject({
      plainText: `row 0: from: ${positionStateId(0)} explicitTo: legacy_pos_1 generatedTo: ${positionStateId(1)} status: explicit_generated_mismatch`,
      status: 'rejected',
      metadata: {
        from: positionStateId(0),
        explicitTo: 'legacy_pos_1',
        generatedTo: positionStateId(1),
        generatedToMissing: false,
        comparisonStatus: 'explicit_generated_mismatch'
      }
    });
  });

  test('converts an accepted generated-target solver gate summary into stable report rows', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
    const summary = summarizeGeneratedTargetSolverGateResult(result);
    const reportModel = generatedTargetSolverGateResultSummaryToReportModel(summary);

    expect(reportModel.kind).toBe('generated_target_solver_gate_summary');
    expect(reportModel.title).toBe('Generated Target Solver Gate Summary');
    expect(reportModel.sections.map((section) => section.id)).toEqual(['summary']);
    expect(reportModel.sections[0]!.rows.map((row) => row.id)).toEqual([
      'accepted',
      'edgeCount',
      'generatedTargetReadyEdgeCount'
    ]);
    expect(reportModel.sections[0]!.rows[0]).toMatchObject({
      plainText: 'accepted: true',
      status: 'ok',
      metadata: { value: true }
    });
  });

  test('keeps gate summary plain text fallback aligned with the existing formatter body', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
    const summary = summarizeGeneratedTargetSolverGateResult(result);
    const reportModel = generatedTargetSolverGateResultSummaryToReportModel(summary);

    expect(formatReportModelPlainText(reportModel)).toBe(
      ['Generated Target Solver Gate Summary', '', '## Summary', formatGeneratedTargetSolverGateResultSummary(summary)].join('\n')
    );
  });

  test('preserves rejected gate summary metadata without connecting generatedTo to solver target', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const summary = summarizeGeneratedTargetSolverGateResult(result);
    const reportModel = generatedTargetSolverGateResultSummaryToReportModel(summary);

    expect(summary.accepted).toBe(false);
    expect(reportModel.sections[0]!.rows.map((row) => row.id)).toEqual([
      'accepted',
      'edgeCount',
      'generatedTargetReadyEdgeCount',
      'rejectionCode',
      'rejectionType',
      'rejectionMessage'
    ]);
    expect(reportModel.sections[0]!.rows.find((row) => row.id === 'accepted')).toMatchObject({
      plainText: 'accepted: false',
      status: 'rejected',
      metadata: { value: false }
    });
    expect(reportModel.sections[0]!.rows.find((row) => row.id === 'rejectionCode')).toMatchObject({
      plainText: 'rejectionCode: missing_generated_target',
      status: 'rejected',
      metadata: { value: 'missing_generated_target' }
    });
  });

  test('does not change generated-target solver gate behavior or baseline values', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);

    expect(result.accepted).toBe(true);
    if (!result.accepted) {
      throw new Error('Expected generated-target gate to accept the representative Sugoroku model');
    }

    const output = toOutputResult(representativeSugorokuModel, result.solvedModel);

    expect(output.expectedReward).toBe(2.25);
    expect(output.expectedRewardByState[positionStateId(0)]).toBe(2.25);
    expect(output.expectedRewardByState[positionStateId(1)]).toBe(1.5);
    expect(output.expectedRewardByState[positionStateId(2)]).toBe(1);
    expect(output.expectedRewardByState[positionStateId(3)]).toBe(0);
  });

  test('runs a Beast mini model through solver contribution and boundary digest', () => {
    const normal = 'state:{phase=normal}';
    const high = 'state:{phase=high}';
    const cz = 'state:{phase=cz}';
    const at = 'state:{phase=at}';
    const normalMiss = 'state:{phase=normal_miss}';
    const highMiss = 'state:{phase=high_miss}';
    const czMiss = 'state:{phase=cz_miss}';
    const atEnd = 'state:{phase=at_end}';
    const beastMiniModel: DefinitionModel = {
      startState: normal,
      states: [
        { id: normal, properties: { phase: 'normal' } },
        { id: high, properties: { phase: 'high' } },
        { id: cz, properties: { phase: 'cz' } },
        { id: at, properties: { phase: 'at' } },
        { id: normalMiss, terminal: true, properties: { phase: 'normal_miss' } },
        { id: highMiss, terminal: true, properties: { phase: 'high_miss' } },
        { id: czMiss, terminal: true, properties: { phase: 'cz_miss' } },
        { id: atEnd, terminal: true, properties: { phase: 'at_end' } }
      ],
      transitions: [
        {
          from: normal,
          to: high,
          probability: 0.2,
          effects: [{ type: 'set_property', property: 'phase', value: 'high' }]
        },
        {
          from: normal,
          to: normalMiss,
          probability: 0.8,
          effects: [{ type: 'set_property', property: 'phase', value: 'normal_miss' }]
        },
        {
          from: high,
          to: cz,
          probability: 0.5,
          effects: [{ type: 'set_property', property: 'phase', value: 'cz' }]
        },
        {
          from: high,
          to: highMiss,
          probability: 0.5,
          effects: [{ type: 'set_property', property: 'phase', value: 'high_miss' }]
        },
        {
          from: cz,
          to: at,
          probability: 0.4,
          effects: [{ type: 'set_property', property: 'phase', value: 'at' }]
        },
        {
          from: cz,
          to: czMiss,
          probability: 0.6,
          effects: [{ type: 'set_property', property: 'phase', value: 'cz_miss' }]
        },
        {
          from: at,
          to: atEnd,
          probability: 1,
          reward: 100,
          effects: [{ type: 'set_property', property: 'phase', value: 'at_end' }]
        }
      ]
    };

    const expanded = expandModel(beastMiniModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(beastMiniModel, solved);
    const contributions = toContributionResult(evaluated, solved);
    const digest = definitionModelToBoundaryReportDigest(beastMiniModel);

    expect(output.expectedReward).toBeCloseTo(4);
    expect(output.expectedRewardByState[normal]).toBeCloseTo(4);
    expect(output.expectedRewardByState[high]).toBeCloseTo(20);
    expect(output.expectedRewardByState[cz]).toBeCloseTo(40);
    expect(output.expectedRewardByState[at]).toBeCloseTo(100);
    expect(contributions.transitionContributionsByState[normal]![0]!.contribution).toBeCloseTo(4);
    expect(contributions.transitionContributionsByState[normal]![1]!.contribution).toBeCloseTo(0);
    expect(digest.reports.map((report) => report.kind)).toEqual([
      'state_graph_summary',
      'transition_probability_audit',
      'generated_target_comparison'
    ]);
    expect(digest.statusOverview.level).toBe('ok');
    expect(digest.reportText).toContain('Transition Probability Audit');
    expect(digest.reportText).toContain('Generated Target Comparison Report');
  });
});
