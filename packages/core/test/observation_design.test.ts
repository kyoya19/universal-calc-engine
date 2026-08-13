import { describe, expect, it } from 'vitest';
import {
  FiniteObservationDesign,
  FiniteObservationDesignResult,
  finiteObservationDesignResultToJson,
  selectFiniteObservationDesigns
} from '../src/observation_design';

type Sparse = Array<{ outcomeId: string; probability: number }>;

function distribution(candidateId: string, entries: Record<string, number>) {
  return {
    candidateId,
    outcomes: Object.entries(entries).map(([outcomeId, probability]) => ({ outcomeId, probability }))
  };
}

function design(
  designId: string,
  candidates: Record<string, Record<string, number>>
): FiniteObservationDesign {
  return {
    designId,
    candidateDistributions: Object.entries(candidates).map(([candidateId, entries]) =>
      distribution(candidateId, entries)
    )
  };
}

function request(designs: FiniteObservationDesign[]) {
  return {
    candidates: [{ candidateId: 'A' }, { candidateId: 'B' }, { candidateId: 'C' }],
    designs
  };
}

function requireSuccess(result: FiniteObservationDesignResult) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function oracleTvL1(left: Sparse, right: Sparse): number {
  const l = new Map(left.map((entry) => [entry.outcomeId, entry.probability] as const));
  const r = new Map(right.map((entry) => [entry.outcomeId, entry.probability] as const));
  const support = new Set([...l.keys(), ...r.keys()]);
  let sum = 0;
  for (const outcome of support) sum += Math.abs((l.get(outcome) ?? 0) - (r.get(outcome) ?? 0));
  return sum / 2;
}

function oracleTvSubsets(left: Sparse, right: Sparse): number {
  const l = new Map(left.map((entry) => [entry.outcomeId, entry.probability] as const));
  const r = new Map(right.map((entry) => [entry.outcomeId, entry.probability] as const));
  const support = [...new Set([...l.keys(), ...r.keys()])];
  let best = 0;
  for (let mask = 0; mask < 2 ** support.length; mask += 1) {
    let lp = 0;
    let rp = 0;
    for (let index = 0; index < support.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue;
      const outcome = support[index];
      if (outcome === undefined) continue;
      lp += l.get(outcome) ?? 0;
      rp += r.get(outcome) ?? 0;
    }
    best = Math.max(best, Math.abs(lp - rp));
  }
  return best;
}

function oracleScore(d: FiniteObservationDesign): number {
  const sorted = [...d.candidateDistributions].sort((a, b) => a.candidateId.localeCompare(b.candidateId));
  const distances: number[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const left = sorted[i];
      const right = sorted[j];
      if (left === undefined || right === undefined) continue;
      distances.push(oracleTvL1(left.outcomes, right.outcomes));
    }
  }
  return Math.min(...distances);
}

const informative = design('informative', {
  A: { x: 0.9, y: 0.1 },
  B: { x: 0.5, y: 0.5 },
  C: { x: 0.1, y: 0.9 }
});

const weak = design('weak', {
  A: { x: 0.7, y: 0.3 },
  B: { x: 0.6, y: 0.4 },
  C: { x: 0.1, y: 0.9 }
});

describe('Candidate I finite observation design', () => {
  it('selects the prior-free maximin design against an independent 0.5-L1 oracle', () => {
    const result = requireSuccess(selectFiniteObservationDesigns(request([weak, informative])));
    expect(oracleScore(informative)).toBeCloseTo(0.4, 14);
    expect(oracleScore(weak)).toBeCloseTo(0.1, 14);
    expect(result.bestWorstCaseSeparation).toBeCloseTo(0.4, 14);
    expect(result.selectedDesignIds).toEqual(['informative']);
    expect(result.classification).toBe('unique_maximin_design');
    const info = result.evaluations.find((entry) => entry.designId === 'informative');
    expect(info?.worstCasePairs.map((pair) => [pair.leftCandidateId, pair.rightCandidateId])).toEqual([
      ['A', 'B'],
      ['B', 'C']
    ]);
    expect(result.diagnostics.candidatePriorUsed).toBe(false);
    expect(result.diagnostics.mutualInformationUsed).toBe(false);
  });

  it('agrees with an independent subset-event total-variation oracle', () => {
    const ternary = design('ternary', {
      A: { x: 0.5, y: 0.3, z: 0.2 },
      B: { x: 0.1, y: 0.6, z: 0.3 },
      C: { x: 0.2, y: 0.2, z: 0.6 }
    });
    const result = requireSuccess(selectFiniteObservationDesigns(request([ternary])));
    const evaluated = result.evaluations[0];
    expect(evaluated).toBeDefined();
    if (evaluated === undefined) return;
    for (const pair of evaluated.pairwiseSeparations) {
      const left = ternary.candidateDistributions.find((d) => d.candidateId === pair.leftCandidateId);
      const right = ternary.candidateDistributions.find((d) => d.candidateId === pair.rightCandidateId);
      expect(left).toBeDefined();
      expect(right).toBeDefined();
      if (left === undefined || right === undefined) continue;
      expect(pair.totalVariationDistance).toBeCloseTo(
        oracleTvSubsets(left.outcomes, right.outcomes),
        14
      );
    }
  });

  it('uses union sparse support with omitted outcomes interpreted as zero', () => {
    const sparse = design('sparse', {
      A: { left: 1 },
      B: { right: 1 },
      C: { left: 0.5, right: 0.5 }
    });
    const result = requireSuccess(selectFiniteObservationDesigns(request([sparse])));
    expect(result.evaluations[0]?.pairwiseSeparations).toEqual([
      { leftCandidateId: 'A', rightCandidateId: 'B', totalVariationDistance: 1 },
      { leftCandidateId: 'A', rightCandidateId: 'C', totalVariationDistance: 0.5 },
      { leftCandidateId: 'B', rightCandidateId: 'C', totalVariationDistance: 0.5 }
    ]);
    expect(result.evaluations[0]?.worstCaseSeparation).toBe(0.5);
  });

  it('is invariant to candidate, design, and outcome order', () => {
    const baseline = requireSuccess(selectFiniteObservationDesigns(request([informative, weak])));
    const reversed: FiniteObservationDesign[] = [weak, informative]
      .reverse()
      .map((d) => ({
        ...d,
        candidateDistributions: [...d.candidateDistributions]
          .reverse()
          .map((candidate) => ({ ...candidate, outcomes: [...candidate.outcomes].reverse() }))
      }));
    const result = requireSuccess(
      selectFiniteObservationDesigns({
        candidates: [{ candidateId: 'C' }, { candidateId: 'A' }, { candidateId: 'B' }],
        designs: reversed
      })
    );
    expect(result).toEqual(baseline);
  });

  it('is invariant to a consistent outcome relabeling', () => {
    const relabel = (d: FiniteObservationDesign): FiniteObservationDesign => ({
      ...d,
      candidateDistributions: d.candidateDistributions.map((candidate) => ({
        ...candidate,
        outcomes: candidate.outcomes.map((entry) => ({
          outcomeId: entry.outcomeId === 'x' ? 'alpha' : 'beta',
          probability: entry.probability
        }))
      }))
    });
    const baseline = requireSuccess(selectFiniteObservationDesigns(request([informative])));
    const result = requireSuccess(selectFiniteObservationDesigns(request([relabel(informative)])));
    expect(result.bestWorstCaseSeparation).toBe(baseline.bestWorstCaseSeparation);
    expect(result.evaluations[0]?.pairwiseSeparations).toEqual(
      baseline.evaluations[0]?.pairwiseSeparations
    );
  });

  it('is invariant to explicit zero-mass sparse outcomes', () => {
    const withZeros: FiniteObservationDesign = {
      ...informative,
      candidateDistributions: informative.candidateDistributions.map((candidate) => ({
        ...candidate,
        outcomes: [...candidate.outcomes, { outcomeId: 'never', probability: 0 }]
      }))
    };
    const baseline = requireSuccess(selectFiniteObservationDesigns(request([informative])));
    const result = requireSuccess(selectFiniteObservationDesigns(request([withZeros])));
    expect(result.bestWorstCaseSeparation).toBe(baseline.bestWorstCaseSeparation);
  });

  it('preserves TV when one outcome is split proportionally for every candidate', () => {
    const split: FiniteObservationDesign = {
      designId: 'informative',
      candidateDistributions: informative.candidateDistributions.map((candidate) => ({
        candidateId: candidate.candidateId,
        outcomes: candidate.outcomes.flatMap((entry) =>
          entry.outcomeId === 'x'
            ? [
                { outcomeId: 'x1', probability: entry.probability * 0.4 },
                { outcomeId: 'x2', probability: entry.probability * 0.6 }
              ]
            : [entry]
        )
      }))
    };
    const baseline = requireSuccess(selectFiniteObservationDesigns(request([informative])));
    const result = requireSuccess(selectFiniteObservationDesigns(request([split])));
    expect(result.bestWorstCaseSeparation).toBeCloseTo(baseline.bestWorstCaseSeparation, 14);
  });

  it('does not let a dominated design remove the existing optimum', () => {
    const identical = design('dominated', {
      A: { x: 0.5, y: 0.5 },
      B: { x: 0.5, y: 0.5 },
      C: { x: 0.5, y: 0.5 }
    });
    const result = requireSuccess(selectFiniteObservationDesigns(request([identical, informative, weak])));
    expect(result.selectedDesignIds).toEqual(['informative']);
    expect(result.evaluations.find((entry) => entry.designId === 'dominated')?.worstCaseSeparation).toBe(0);
  });

  it('preserves complete optimal ties and selection-tolerance ambiguity', () => {
    const copy: FiniteObservationDesign = {
      designId: 'informative-copy',
      candidateDistributions: informative.candidateDistributions.map((entry) => ({
        candidateId: entry.candidateId,
        outcomes: entry.outcomes.map((outcome) => ({ ...outcome }))
      }))
    };
    const tied = requireSuccess(selectFiniteObservationDesigns(request([copy, informative])));
    expect(tied.classification).toBe('tied_maximin_design');
    expect(tied.selectedDesignIds).toEqual(['informative', 'informative-copy']);

    const near = design('near', {
      A: { x: 0.9000000000004, y: 0.0999999999996 },
      B: { x: 0.5, y: 0.5 },
      C: { x: 0.1, y: 0.9 }
    });
    const tolerant = requireSuccess(
      selectFiniteObservationDesigns(request([informative, near]), { selectionTolerance: 1e-12 })
    );
    expect(tolerant.selectedDesignIds).toEqual(['informative', 'near']);
  });

  it('reports zero worst-case separation without claiming global non-identifiability', () => {
    const zero = design('zero', {
      A: { x: 0.8, y: 0.2 },
      B: { x: 0.8, y: 0.2 },
      C: { x: 0.1, y: 0.9 }
    });
    const result = requireSuccess(selectFiniteObservationDesigns(request([zero])));
    expect(result.bestWorstCaseSeparation).toBe(0);
    expect(result.evaluations[0]?.worstCaseClassification).toBe('zero_worst_case_separation');
    expect(result.evaluations[0]?.worstCasePairs).toEqual([
      { leftCandidateId: 'A', rightCandidateId: 'B', totalVariationDistance: 0 }
    ]);
    expect(result.diagnostics.globalStructuralIdentifiabilityClaimed).toBe(false);
    expect(result.diagnostics.guaranteedSingleObservationIdentificationClaimed).toBe(false);
  });

  it('rejects malformed candidate and design families explicitly', () => {
    const tooFew = selectFiniteObservationDesigns({
      candidates: [{ candidateId: 'A' }],
      designs: [informative]
    });
    expect(tooFew.ok).toBe(false);
    if (!tooFew.ok) expect(tooFew.failure.code).toBe('invalid_candidate_family');

    const duplicateCandidate = selectFiniteObservationDesigns({
      candidates: [{ candidateId: 'A' }, { candidateId: 'A' }],
      designs: [informative]
    });
    expect(duplicateCandidate.ok).toBe(false);
    if (!duplicateCandidate.ok) expect(duplicateCandidate.failure.code).toBe('duplicate_candidate_id');

    const emptyDesigns = selectFiniteObservationDesigns({
      candidates: [{ candidateId: 'A' }, { candidateId: 'B' }],
      designs: []
    });
    expect(emptyDesigns.ok).toBe(false);
    if (!emptyDesigns.ok) expect(emptyDesigns.failure.code).toBe('invalid_design_set');
  });

  it('rejects missing, duplicate, and unknown candidate distributions', () => {
    const baseCandidates = [{ candidateId: 'A' }, { candidateId: 'B' }];
    const missing = selectFiniteObservationDesigns({
      candidates: baseCandidates,
      designs: [design('missing', { A: { x: 1 } })]
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.failure.code).toBe('missing_candidate_distribution');

    const duplicate = selectFiniteObservationDesigns({
      candidates: baseCandidates,
      designs: [{
        designId: 'duplicate',
        candidateDistributions: [
          distribution('A', { x: 1 }),
          distribution('A', { x: 1 }),
          distribution('B', { x: 1 })
        ]
      }]
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.failure.code).toBe('duplicate_candidate_distribution');

    const unknown = selectFiniteObservationDesigns({
      candidates: baseCandidates,
      designs: [{
        designId: 'unknown',
        candidateDistributions: [distribution('A', { x: 1 }), distribution('Z', { x: 1 })]
      }]
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.failure.code).toBe('invalid_candidate_distribution');
  });

  it('rejects invalid outcome distributions, totals, options, and resource limits', () => {
    const candidates = [{ candidateId: 'A' }, { candidateId: 'B' }];
    const badProbability = selectFiniteObservationDesigns({
      candidates,
      designs: [{
        designId: 'bad',
        candidateDistributions: [
          distribution('A', { x: -0.1, y: 1.1 }),
          distribution('B', { x: 0.5, y: 0.5 })
        ]
      }]
    });
    expect(badProbability.ok).toBe(false);
    if (!badProbability.ok) expect(badProbability.failure.code).toBe('invalid_outcome_distribution');

    const badTotal = selectFiniteObservationDesigns({
      candidates,
      designs: [{
        designId: 'bad-total',
        candidateDistributions: [
          distribution('A', { x: 0.8, y: 0.1 }),
          distribution('B', { x: 0.5, y: 0.5 })
        ]
      }]
    });
    expect(badTotal.ok).toBe(false);
    if (!badTotal.ok) expect(badTotal.failure.code).toBe('distribution_total_invalid');

    const badOption = selectFiniteObservationDesigns(
      { candidates, designs: [design('ok', { A: { x: 1 }, B: { x: 1 } })] },
      { probabilityTolerance: 0 }
    );
    expect(badOption.ok).toBe(false);
    if (!badOption.ok) expect(badOption.failure.code).toBe('invalid_options');

    const limited = selectFiniteObservationDesigns(
      { candidates, designs: [design('ok', { A: { x: 1 }, B: { x: 1 } })] },
      { maxCandidates: 1 }
    );
    expect(limited.ok).toBe(false);
    if (!limited.ok) expect(limited.failure.code).toBe('candidate_count_exceeds_limit');
  });

  it('serializes deterministically and rejects forged non-finite numeric output', () => {
    const result = requireSuccess(selectFiniteObservationDesigns(request([weak, informative])));
    expect(finiteObservationDesignResultToJson(result)).toBe(JSON.stringify(result));
    const forged = structuredClone(result) as typeof result;
    forged.bestWorstCaseSeparation = Number.NaN;
    expect(() => finiteObservationDesignResultToJson(forged)).toThrow(/non-finite numeric value/);
  });
});
