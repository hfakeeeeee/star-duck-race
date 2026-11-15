// Cosmetic only: the nose crosses the line at the unchanged simulation time.
export function winnerLift(secondsSinceFinish: number, reducedMotion = false) {
  if (reducedMotion || secondsSinceFinish < 0 || secondsSinceFinish > 1.3) return { height: 0, scale: 1, tilt: 0 };
  const arc = Math.sin(Math.PI * secondsSinceFinish / 1.3);
  return { height: arc * 3.6, scale: 1 + arc * .18, tilt: arc * .32 };
}
