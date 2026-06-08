import { describe, expect, test } from 'vitest';
import { ExpandedStateEdge, selectGraphTarget } from '../src/state_generation';

describe('graph target policy', () => {
  const mismatchedEdge: ExpandedStateEdge = {
    from: 'pos_0',
    explicitTo: 'legacy_pos_1',
    generatedTo: 'state:{position=1}',
    transition: {
      from: 'pos_0',
      to: 'legacy_pos_1',
      probability: 1,
      effects: [{ type: 'set_property', property: 'position', value: 1 }]
    }
  };

  test('keeps diagnostics-only target selection equivalent to explicit-only', () => {
    expect(selectGraphTarget(mismatchedEdge, 'explicit_only')).toBe('legacy_pos_1');
    expect(selectGraphTarget(mismatchedEdge, 'diagnostics_only')).toBe('legacy_pos_1');
  });
});
