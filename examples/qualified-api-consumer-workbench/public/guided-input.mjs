function number(value) {
  return typeof value === 'number' ? value : Number(value);
}

export function buildGuidedForward({ reward = 2, elapsedSeconds = 1 } = {}) {
  return {
    schemaVersion: 1,
    modelKind: 'base',
    parameterValues: {},
    model: {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      parameters: [],
      transitions: [
        {
          from: 'start',
          to: 'done',
          probability: 1,
          reward: number(reward),
          elapsedTime: { value: number(elapsedSeconds), unit: 'seconds' }
        }
      ]
    }
  };
}

export function buildGuidedReverse({
  candidateA = 0.25,
  candidateB = 0.75,
  observedA = 1,
  observedB = 1
} = {}) {
  const countA = number(observedA);
  const countB = number(observedB);

  return {
    schemaVersion: 1,
    estimationKind: 'discrete_parameter_candidates',
    modelDocument: {
      schemaVersion: 1,
      modelKind: 'base',
      model: {
        startState: 'start',
        states: [
          { id: 'start' },
          { id: 'a', terminal: true },
          { id: 'b', terminal: true }
        ],
        parameters: [{ id: 'p' }],
        transitions: [
          {
            from: 'start',
            to: 'a',
            probability: { type: 'parameter_ref', parameter: 'p' }
          },
          {
            from: 'start',
            to: 'b',
            probability: {
              type: 'formula',
              operator: 'subtract',
              left: 1,
              right: { type: 'parameter_ref', parameter: 'p' }
            }
          }
        ]
      }
    },
    observationDataset: {
      schemaVersion: 1,
      observations: [
        {
          id: 'departures',
          type: 'state_count',
          state: 'start',
          count: countA + countB
        },
        {
          id: 'to-a',
          type: 'transition_count',
          from: 'start',
          to: 'a',
          count: countA
        },
        {
          id: 'to-b',
          type: 'transition_count',
          from: 'start',
          to: 'b',
          count: countB
        }
      ]
    },
    request: {
      parameterId: 'p',
      candidates: [number(candidateA), number(candidateB)]
    }
  };
}

export function toGuidedDocumentText(operation, values) {
  const document =
    operation === 'reverse' ? buildGuidedReverse(values) : buildGuidedForward(values);
  return `${JSON.stringify(document, null, 2)}\n`;
}
