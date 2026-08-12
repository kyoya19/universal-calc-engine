import { describe, expect, it } from 'vitest';
import { ExternalModelDocument } from '../src/external_input';
import {
  FiniteModelFamilyIdentifiabilityResult,
  FiniteModelFamilyIdentifiabilitySuccess,
  classifyFiniteModelFamilyIdentifiability,
  finiteModelFamilyIdentifiabilityResultToJson
} from '../src/model_family_identifiability';

function document(probabilityToA: number): ExternalModelDocument {
  return {
    schemaVersion: 1,
    modelKind: 'base',
    model: {
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'a', terminal: true },
        { id: 'b', terminal: true }
      ],
      parameters: [],
      transitions: [
        { from: 'start', to: 'a', probability: probabilityToA },
        { from: 'start', to: 'b', probability: 1 - probabilityToA }
      ]
    }
  };
}

function splitDocument(probabilityToA: number): ExternalModelDocument {
  return {
    schemaVersion: 1,
    modelKind: 'base',
    model: {
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'a', terminal: true },
        { id: 'b', terminal: true }
      ],
      parameters: [],
      transitions: [
        { from: 'start', to: 'a', probability: probabilityToA / 2 },
        { from: 'start', to: 'a', probability: probabilityToA / 2 },
        { from: 'start', to: 'b', probability: 1 - probabilityToA }
      ]
    }
  };
}

function requireSuccess(
  result: FiniteModelFamilyIdentifiabilityResult
): FiniteModelFamilyIdentifiabilitySuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

const transitionProbe = {
  probeId: 'p-transition-a',
  type: 'transition_probability' as const,
  from: 'start',
  to: 'a'
};

const stateProbe = {
  probeId: 'p-state-a-h1',
  type: 'state_probability' as const,
  initialDistribution: [{ stateId: 'start', probability: 1 }],
  horizon: 1,
  stateId: 'a'
};

describe('Candidate D finite model-family identifiability foundation', () => {
  it('classifies a fully distinguishable finite family from direct observable signatures', () => {
    const result = requireSuccess(
      classifyFiniteModelFamilyIdentifiability({
        candidates: [
          { candidateId: 'm-low', document: document(0.25) },
          { candidateId: 'm-high', document: document(0.75) }
        ],
        probes: [transitionProbe]
      })
    );

    expect(result.familyClassification).toBe('fully_distinguishable');
    expect(result.signatures).toEqual([
      { candidateId: 'm-high', coordinates: [{ probeId: 'p-transition-a', value: 0.75 }] },
      { candidateId: 'm-low', coordinates: [{ probeId: 'p-transition-a', value: 0.25 }] }
    ]);
    expect(result.pairwise[0]).toMatchObject({
      leftCandidateId: 'm-high',
      rightCandidateId: 'm-low',
      distinguished: true,
      maxAbsoluteDifference: 0.5,
      witnessProbeIds: ['p-transition-a']
    });
    expect(result.candidates.every((candidate) => candidate.classification === 'uniquely_distinguishable_within_family')).toBe(true);
    expect(result.diagnostics.globalStructuralIdentifiabilityClaimed).toBe(false);
    expect(result.diagnostics.simulationUsed).toBe(false);
  });

  it('uses Candidate A state-distribution propagation as an independent dynamic observation coordinate', () => {
    const result = requireSuccess(
      classifyFiniteModelFamilyIdentifiability({
        candidates: [
          { candidateId: 'm1', document: document(0.2) },
          { candidateId: 'm2', document: document(0.8) }
        ],
        probes: [stateProbe]
      })
    );

    expect(result.signatures).toEqual([
      { candidateId: 'm1', coordinates: [{ probeId: 'p-state-a-h1', value: 0.2 }] },
      { candidateId: 'm2', coordinates: [{ probeId: 'p-state-a-h1', value: 0.8 }] }
    ]);
    expect(result.pairwise[0]?.distinguished).toBe(true);
  });

  it('preserves ambiguity when candidates have identical signatures under the declared probes', () => {
    const result = requireSuccess(
      classifyFiniteModelFamilyIdentifiability({
        candidates: [
          { candidateId: 'same-a', document: document(0.4) },
          { candidateId: 'same-b', document: document(0.4) }
        ],
        probes: [transitionProbe, stateProbe]
      })
    );

    expect(result.familyClassification).toBe('fully_unresolved_within_tolerance');
    expect(result.pairwise[0]).toMatchObject({ distinguished: false, maxAbsoluteDifference: 0 });
    expect(result.candidates).toEqual([
      {
        candidateId: 'same-a',
        classification: 'ambiguous_under_observation_design',
        unresolvedPeerCandidateIds: ['same-b']
      },
      {
        candidateId: 'same-b',
        classification: 'ambiguous_under_observation_design',
        unresolvedPeerCandidateIds: ['same-a']
      }
    ]);
  });

  it('reports tolerance comparisons pairwise without fabricating transitive equivalence classes', () => {
    const result = requireSuccess(
      classifyFiniteModelFamilyIdentifiability({
        candidates: [
          { candidateId: 'a', document: document(0.5) },
          { candidateId: 'b', document: document(0.5000000009) },
          { candidateId: 'c', document: document(0.5000000018) }
        ],
        probes: [transitionProbe],
        comparisonTolerance: 1e-9
      })
    );

    expect(result.familyClassification).toBe('partially_distinguishable');
    expect(result.pairwise.map((pair) => pair.distinguished)).toEqual([false, true, false]);
    expect(result.candidates.every((candidate) => candidate.classification === 'ambiguous_under_observation_design')).toBe(true);
    expect(result.diagnostics.approximateEqualityTransitivityAssumed).toBe(false);
  });

  it('is invariant to candidate and probe input order', () => {
    const first = requireSuccess(
      classifyFiniteModelFamilyIdentifiability({
        candidates: [
          { candidateId: 'z', document: document(0.7) },
          { candidateId: 'a', document: document(0.3) }
        ],
        probes: [stateProbe, transitionProbe]
      })
    );
    const second = requireSuccess(
      classifyFiniteModelFamilyIdentifiability({
        candidates: [
          { candidateId: 'a', document: document(0.3) },
          { candidateId: 'z', document: document(0.7) }
        ],
        probes: [transitionProbe, stateProbe]
      })
    );

    expect(second).toEqual(first);
  });

  it('treats split parallel transitions by their aggregate observable probability', () => {
    const result = requireSuccess(
      classifyFiniteModelFamilyIdentifiability({
        candidates: [
          { candidateId: 'single', document: document(0.6) },
          { candidateId: 'split', document: splitDocument(0.6) }
        ],
        probes: [transitionProbe]
      })
    );

    expect(result.familyClassification).toBe('fully_unresolved_within_tolerance');
    expect(result.pairwise[0]?.maxAbsoluteDifference).toBe(0);
  });

  it('rejects duplicate candidate and probe identifiers explicitly', () => {
    const duplicateCandidate = classifyFiniteModelFamilyIdentifiability({
      candidates: [
        { candidateId: 'dup', document: document(0.2) },
        { candidateId: 'dup', document: document(0.8) }
      ],
      probes: [transitionProbe]
    });
    expect(duplicateCandidate.ok).toBe(false);
    if (!duplicateCandidate.ok) expect(duplicateCandidate.failure.code).toBe('invalid_candidate');

    const duplicateProbe = classifyFiniteModelFamilyIdentifiability({
      candidates: [
        { candidateId: 'a', document: document(0.2) },
        { candidateId: 'b', document: document(0.8) }
      ],
      probes: [transitionProbe, { ...transitionProbe }]
    });
    expect(duplicateProbe.ok).toBe(false);
    if (!duplicateProbe.ok) expect(duplicateProbe.failure.code).toBe('invalid_probe');
  });

  it('rejects probes that cannot be evaluated uniformly across the family', () => {
    const result = classifyFiniteModelFamilyIdentifiability({
      candidates: [
        { candidateId: 'a', document: document(0.2) },
        { candidateId: 'b', document: document(0.8) }
      ],
      probes: [{ ...transitionProbe, to: 'missing' }]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('probe_evaluation');
      expect(result.failure.code).toBe('invalid_probe');
      expect(result.failure.probeId).toBe('p-transition-a');
    }
  });

  it('surfaces Candidate A validation failures rather than normalizing invalid initial distributions', () => {
    const result = classifyFiniteModelFamilyIdentifiability({
      candidates: [
        { candidateId: 'a', document: document(0.2) },
        { candidateId: 'b', document: document(0.8) }
      ],
      probes: [
        {
          ...stateProbe,
          initialDistribution: [{ stateId: 'start', probability: 0.9 }]
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe('probe_evaluation_failed');
      expect(result.failure.stateDistributionFailure?.code).toBe('initial_probability_total');
    }
  });

  it('rejects invalid tolerance and forged non-finite serialization', () => {
    const invalid = classifyFiniteModelFamilyIdentifiability({
      candidates: [
        { candidateId: 'a', document: document(0.2) },
        { candidateId: 'b', document: document(0.8) }
      ],
      probes: [transitionProbe],
      comparisonTolerance: Number.NaN
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.failure.code).toBe('invalid_request');

    const valid = requireSuccess(
      classifyFiniteModelFamilyIdentifiability({
        candidates: [
          { candidateId: 'a', document: document(0.2) },
          { candidateId: 'b', document: document(0.8) }
        ],
        probes: [transitionProbe]
      })
    );
    const forged = structuredClone(valid);
    forged.signatures[0]!.coordinates[0]!.value = Number.POSITIVE_INFINITY;
    expect(() => finiteModelFamilyIdentifiabilityResultToJson(forged)).toThrow(/non-finite/);
  });
});
