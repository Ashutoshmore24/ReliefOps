import { describe, expect, it } from 'vitest';
import { advanceCargo, cargoPosition, retargetCargo } from './motion';
describe('cargo movement', () => {
  it('lifts before transfer and lands at the exact selected target', () => {
    const motion = retargetCargo([-5, .6, -1], [0, 1.1, 2], 1);
    expect(cargoPosition(motion)).toEqual([-5, .6, -1]);
    const lifting = cargoPosition({ ...motion, elapsed: .12 });
    expect(lifting[0]).toBe(-5); expect(lifting[1]).toBeGreaterThan(.6);
    expect(cargoPosition({ ...motion, elapsed: 1 })[0]).toBe(0);
    expect(cargoPosition({ ...motion, elapsed: 1 })[1]).toBeCloseTo(1.1);
    expect(cargoPosition({ ...motion, elapsed: 1 })[2]).toBe(2);
  });
  it('freezes on pause and resumes without consuming hidden time', () => {
    const motion = advanceCargo(retargetCargo([0, 0, 0], [3, 1, 0], .8), .03, false);
    expect(advanceCargo(motion, 30, true)).toBe(motion);
    expect(advanceCargo(motion, .03, false).elapsed).toBeCloseTo(.06);
  });
  it('retargets obsolete motion from its actual current position', () => {
    const old = retargetCargo([0, 0, 0], [8, 1, 3], 1);
    const current = cargoPosition({ ...old, elapsed: .4 });
    const next = retargetCargo(current, [-2, .5, 1], .25);
    expect(cargoPosition(next)).toEqual(current);
    expect(cargoPosition({ ...next, elapsed: 1 })).toEqual([-2, .5, 1]);
    expect(next.to).not.toEqual(old.to);
  });
});
