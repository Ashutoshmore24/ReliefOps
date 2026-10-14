export type Point3 = [number, number, number];
export interface CargoMotion { from: Point3; to: Point3; elapsed: number; duration: number; lift: number }
export function cargoPosition(motion: CargoMotion): Point3 {
  const t = Math.max(0, Math.min(1, motion.elapsed / motion.duration));
  if (t === 0) return [...motion.from];
  if (t === 1) return [...motion.to];
  // Smooth lift, horizontal transfer, then landing. Retargeting starts at the
  // current rendered position, so fast playback never builds an animation queue.
  const smooth = (value: number) => value * value * (3 - 2 * value);
  const travel = smooth(Math.max(0, Math.min(1, (t - .16) / .68)));
  const vertical = smooth(t);
  const arc = Math.sin(Math.PI * t) * motion.lift;
  return [motion.from[0] + (motion.to[0] - motion.from[0]) * travel,
    motion.from[1] + (motion.to[1] - motion.from[1]) * vertical + arc,
    motion.from[2] + (motion.to[2] - motion.from[2]) * travel];
}
export function retargetCargo(current: Point3, target: Point3, duration: number): CargoMotion {
  const distance = Math.hypot(target[0] - current[0], target[2] - current[2]);
  return { from: [...current], to: [...target], elapsed: 0, duration: Math.max(.12, duration), lift: distance > .15 ? Math.min(1.8, .65 + distance * .14) : 0 };
}
export function advanceCargo(motion: CargoMotion, delta: number, frozen: boolean): CargoMotion {
  return frozen ? motion : { ...motion, elapsed: Math.min(motion.duration, motion.elapsed + Math.min(.05, Math.max(0, delta))) };
}
