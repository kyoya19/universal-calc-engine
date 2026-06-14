import type {
  GeneratedTargetComparisonReport,
  GeneratedTargetComparisonReportRowStatus,
  GeneratedTargetSolverGateResultSummary
} from './generated_target_solver_adapter';
import type {
  TransitionProbabilityAuditResult,
  TransitionProbabilityAuditRow
} from './model';

export type ReportRowStatus = 'ok' | 'warning' | 'rejected' | 'info';

export type ReportRow = {
  id: string;
  label: string;
  plainText: string;
  tex?: string;
  className?: string;
  status?: ReportRowStatus;
  metadata?: Record<string, unknown>;
};

export type ReportSection = {
  id: string;
  title: string;
  rows: ReportRow[];
};

export type ReportModel = {
  kind: string;
  title: string;
  sections: ReportSection[];
};

function comparisonStatusToReportStatus(status: GeneratedTargetComparisonReportRowStatus): ReportRowStatus {
  if (status === 'match') {
    return 'ok';
  }

  return 'rejected';
}

function transitionProbabilityAuditRowToReportStatus(row: TransitionProbabilityAuditRow): ReportRowStatus {
  if (!row.valid) {
    return 'rejected';
  }

  return row.terminal ? 'info' : 'ok';
}

export function formatReportModelPlainText(report: ReportModel): string {
  return [
    report.title,
    ...report.sections.flatMap((section) => [
      '',
      `## ${section.title}`,
      ...section.rows.map((row) => row.plainText)
    ])
  ].join('\n');
}

export function generatedTargetSolverGateResultSummaryToReportModel(
  summary: GeneratedTargetSolverGateResultSummary
): ReportModel {
  const summaryRows: ReportRow[] = [
    {
      id: 'accepted',
      label: 'accepted',
      plainText: `accepted: ${summary.accepted}`,
      status: summary.accepted ? 'ok' : 'rejected',
      metadata: { value: summary.accepted }
    },
    {
      id: 'edgeCount',
      label: 'edgeCount',
      plainText: `edgeCount: ${summary.edgeCount}`,
      status: 'info',
      metadata: { value: summary.edgeCount }
    },
    {
      id: 'generatedTargetReadyEdgeCount',
      label: 'generatedTargetReadyEdgeCount',
      plainText: `generatedTargetReadyEdgeCount: ${summary.generatedTargetReadyEdgeCount}`,
      status: 'info',
      metadata: { value: summary.generatedTargetReadyEdgeCount }
    }
  ];

  if (!summary.accepted) {
    summaryRows.push(
      {
        id: 'rejectionCode',
        label: 'rejectionCode',
        plainText: `rejectionCode: ${summary.rejectionCode}`,
        status: 'rejected',
        metadata: { value: summary.rejectionCode }
      },
      {
        id: 'rejectionType',
        label: 'rejectionType',
        plainText: `rejectionType: ${summary.rejectionType}`,
        status: 'rejected',
        metadata: { value: summary.rejectionType }
      },
      {
        id: 'rejectionMessage',
        label: 'rejectionMessage',
        plainText: `rejectionMessage: ${summary.rejectionMessage}`,
        status: 'rejected',
        metadata: { value: summary.rejectionMessage }
      }
    );
  }

  return {
    kind: 'generated_target_solver_gate_summary',
    title: 'Generated Target Solver Gate Summary',
    sections: [
      {
        id: 'summary',
        title: 'Summary',
        rows: summaryRows
      }
    ]
  };
}

export function transitionProbabilityAuditResultToReportModel(
  result: TransitionProbabilityAuditResult
): ReportModel {
  return {
    kind: 'transition_probability_audit',
    title: 'Transition Probability Audit',
    sections: [
      {
        id: 'summary',
        title: 'Summary',
        rows: [
          {
            id: 'valid',
            label: 'valid',
            plainText: `valid: ${result.valid}`,
            status: result.valid ? 'ok' : 'rejected',
            metadata: { value: result.valid }
          },
          {
            id: 'rowCount',
            label: 'rowCount',
            plainText: `rowCount: ${result.rows.length}`,
            status: 'info',
            metadata: { value: result.rows.length }
          },
          {
            id: 'invalidRowCount',
            label: 'invalidRowCount',
            plainText: `invalidRowCount: ${result.invalidRows.length}`,
            status: result.invalidRows.length === 0 ? 'ok' : 'rejected',
            metadata: { value: result.invalidRows.length }
          }
        ]
      },
      {
        id: 'rows',
        title: 'Rows',
        rows: result.rows.map((row, index) => ({
          id: `row-${index}`,
          label: row.stateId,
          plainText: [
            `row ${index}:`,
            `stateId: ${row.stateId}`,
            `transitionCount: ${row.transitionCount}`,
            `probabilityTotal: ${row.probabilityTotal}`,
            `deviationFromOne: ${row.deviationFromOne}`,
            `terminal: ${row.terminal}`,
            `valid: ${row.valid}`
          ].join(' '),
          className: `transition-probability-audit-row transition-probability-audit-row--${row.valid ? 'valid' : 'invalid'}`,
          status: transitionProbabilityAuditRowToReportStatus(row),
          metadata: {
            stateId: row.stateId,
            transitionCount: row.transitionCount,
            probabilityTotal: row.probabilityTotal,
            deviationFromOne: row.deviationFromOne,
            terminal: row.terminal,
            valid: row.valid
          }
        }))
      }
    ]
  };
}

export function generatedTargetComparisonReportToReportModel(
  report: GeneratedTargetComparisonReport
): ReportModel {
  return {
    kind: 'generated_target_comparison',
    title: 'Generated Target Comparison Report',
    sections: [
      {
        id: 'summary',
        title: 'Summary',
        rows: [
          {
            id: 'edgeCount',
            label: 'edgeCount',
            plainText: `edgeCount: ${report.edgeCount}`,
            status: 'info',
            metadata: { value: report.edgeCount }
          },
          {
            id: 'matchCount',
            label: 'matchCount',
            plainText: `matchCount: ${report.matchCount}`,
            status: 'ok',
            metadata: { value: report.matchCount }
          },
          {
            id: 'missingGeneratedTargetCount',
            label: 'missingGeneratedTargetCount',
            plainText: `missingGeneratedTargetCount: ${report.missingGeneratedTargetCount}`,
            status: report.missingGeneratedTargetCount === 0 ? 'ok' : 'rejected',
            metadata: { value: report.missingGeneratedTargetCount }
          },
          {
            id: 'explicitGeneratedMismatchCount',
            label: 'explicitGeneratedMismatchCount',
            plainText: `explicitGeneratedMismatchCount: ${report.explicitGeneratedMismatchCount}`,
            status: report.explicitGeneratedMismatchCount === 0 ? 'ok' : 'rejected',
            metadata: { value: report.explicitGeneratedMismatchCount }
          }
        ]
      },
      {
        id: 'rows',
        title: 'Rows',
        rows: report.rows.map((row, index) => ({
          id: `row-${index}`,
          label: `row ${index}`,
          plainText: [
            `row ${index}:`,
            `from: ${row.from}`,
            `explicitTo: ${row.explicitTo}`,
            `generatedTo: ${row.generatedTo ?? '<missing>'}`,
            `status: ${row.status}`
          ].join(' '),
          className: `generated-target-comparison-row generated-target-comparison-row--${row.status}`,
          status: comparisonStatusToReportStatus(row.status),
          metadata: {
            from: row.from,
            explicitTo: row.explicitTo,
            generatedTo: row.generatedTo,
            generatedToMissing: row.generatedTo === undefined,
            comparisonStatus: row.status
          }
        }))
      }
    ]
  };
}
