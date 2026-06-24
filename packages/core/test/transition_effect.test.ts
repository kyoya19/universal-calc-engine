import { describe, expect, test } from 'vitest';
import {
  applyTransitionEffect,
  applyTransitionEffects,
  getTransitionEffectKind,
  serializeTransitionEffect,
  type TransitionEffect
} from '../src';

describe('TransitionEffect boundary', () => {
  test('keeps set_property effect kind and serialization unchanged', () => {
    const effect: TransitionEffect = {
      type: 'set_property',
      property: 'position',
      value: 3
    };

    expect(getTransitionEffectKind(effect)).toBe('set_property');
    expect(serializeTransitionEffect(effect)).toEqual({
      type: 'set_property',
      property: 'position',
      value: 3
    });
    expect(serializeTransitionEffect(effect)).not.toBe(effect);
  });

  test('applies a single set_property effect without mutating the input properties', () => {
    const properties = { position: 1, label: 'start' };
    const applied = applyTransitionEffect(properties, {
      type: 'set_property',
      property: 'position',
      value: 2
    });

    expect(applied).toEqual({ position: 2, label: 'start' });
    expect(properties).toEqual({ position: 1, label: 'start' });
    expect(applied).not.toBe(properties);
  });

  test('keeps applyTransitionEffects behavior for undefined and empty effects unchanged', () => {
    expect(applyTransitionEffects(undefined, undefined)).toEqual({});

    const properties = { done: false };
    const applied = applyTransitionEffects(properties, []);

    expect(applied).toEqual({ done: false });
    expect(applied).not.toBe(properties);
  });

  test('applies effects sequentially and preserves later writes', () => {
    const applied = applyTransitionEffects(
      { position: 0, done: false },
      [
        { type: 'set_property', property: 'position', value: 1 },
        { type: 'set_property', property: 'done', value: true },
        { type: 'set_property', property: 'position', value: 2 }
      ]
    );

    expect(applied).toEqual({ position: 2, done: true });
  });
});
