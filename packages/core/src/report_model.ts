import type { GeneratedTargetComparisonReport, GeneratedTargetComparisonReportRowStatus } from './generated_target_solver_adapter';

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
