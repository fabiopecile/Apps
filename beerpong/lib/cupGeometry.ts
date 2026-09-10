/**
 * The shape of a cup, as a profile to spin into a solid.
 *
 * A cup is a solid of revolution, so all it needs is its silhouette from the
 * axis outwards; the renderer lathes this into geometry and the camera decides
 * what it looks like from where you sit. That is a real simplification over
 * what stood here before: the drawing used to work out for itself how open each
 * mouth should appear, because there was no camera to do it.
 *
 * All measurements are fractions of the cup's mouth diameter, so one profile
 * serves any size.
 */

import { CUP_ASPECT } from './arcadeLayout';

/** Outer radius at the rim and at the base, as fractions of the diameter. */
export const RIM_RADIUS = 0.5;
export const BASE_RADIUS = 0.365;
/** Wall thickness, so the rim reads as a rim rather than a paper edge. */
const WALL = 0.022;
/** How far down the inside the beer sits. */
export const BEER_DEPTH = 0.12;

export interface ProfilePoint {
  /** Distance from the axis, in diameters. */
  r: number;
  /** Height above the table, in diameters. */
  y: number;
}

/**
 * The silhouette, walked as one loop: up the outside, across the rim, and back
 * down the inside to the base. Spun about the axis this gives a cup with a
 * genuine wall — you can see into it, and the rim has thickness.
 *
 * Slightly barrelled rather than a straight cone, which is what a moulded cup
 * actually does and what catches the light along its side.
 */
export function cupProfile(): ProfilePoint[] {
  const h = CUP_ASPECT;
  const outside: ProfilePoint[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = BASE_RADIUS + (RIM_RADIUS - BASE_RADIUS) * t;
    // A gentle outward bow through the middle of the wall.
    const bow = Math.sin(t * Math.PI) * 0.012;
    outside.push({ r: r + bow, y: t * h });
  }
  const inside: ProfilePoint[] = [];
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const r = BASE_RADIUS + (RIM_RADIUS - BASE_RADIUS) * t;
    const bow = Math.sin(t * Math.PI) * 0.012;
    inside.push({ r: Math.max(0.02, r + bow - WALL), y: Math.max(WALL * 2, t * h) });
  }
  return [{ r: 0, y: 0 }, ...outside, ...inside, { r: 0, y: WALL * 2 }];
}

/** Where the beer surface sits, in diameters above the table. */
export function beerHeight(): number {
  return CUP_ASPECT * (1 - BEER_DEPTH);
}

/** How wide the beer disc is at that height, in diameters. */
export function beerRadius(): number {
  const t = 1 - BEER_DEPTH;
  return BASE_RADIUS + (RIM_RADIUS - BASE_RADIUS) * t - WALL;
}
