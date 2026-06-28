export type TurnDirection = "next" | "prev";

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** EaseInOut with a subtle settle bounce at the end (700–900ms animations). */
export function turnAnimationEase(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const base =
    clamped < 0.5
      ? 4 * clamped * clamped * clamped
      : 1 - Math.pow(-2 * clamped + 2, 3) / 2;

  if (clamped > 0.86) {
    const tail = (clamped - 0.86) / 0.14;
    const bounce = Math.sin(tail * Math.PI) * 0.038 * (1 - clamped);
    return Math.min(1, base + bounce);
  }

  return base;
}

function cornerDistance(
  u: number,
  v: number,
  direction: TurnDirection,
): number {
  if (direction === "next") {
    const dx = 1 - u;
    const dy = 1 - v;
    return Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
  }

  const dx = u;
  const dy = 1 - v;
  return Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
}

function cornerProximity(
  u: number,
  v: number,
  direction: TurnDirection,
): number {
  return 1 - cornerDistance(u, v, direction);
}

export function computeCurlAmount(
  u: number,
  v: number,
  progress: number,
  direction: TurnDirection,
): number {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) {
    return 0;
  }

  const dist = cornerDistance(u, v, direction);
  const peelRadius = p * 1.02;
  if (dist > peelRadius) {
    return 0;
  }

  const raw = 1 - dist / Math.max(peelRadius, 0.0001);
  return smoothstep(raw);
}

export function deformPageVertex(
  u: number,
  v: number,
  width: number,
  height: number,
  curl: number,
  direction: TurnDirection,
): [number, number, number] {
  const x0 = (u - 0.5) * width;
  const y0 = (0.5 - v) * height;

  if (curl <= 0.0001) {
    return [x0, y0, 0];
  }

  const c = smoothstep(curl);
  const arch = Math.sin(c * Math.PI);
  const tip = cornerProximity(u, v, direction);
  const spineT = direction === "next" ? u : 1 - u;
  const radius = width * (0.3 + arch * 0.11 + tip * 0.04);
  const theta =
    c * Math.PI * 0.52 * spineT * (0.5 + tip * 0.5) * (0.78 + (1 - v) * 0.22);

  if (direction === "next") {
    const hingeX = -width * 0.5;
    const span = Math.max(0, x0 - hingeX);
    const spanNorm = span / Math.max(width, 1);
    const wrapped = radius * Math.sin(theta) * spanNorm * 2;
    const depth =
      radius * (1 - Math.cos(theta)) * spanNorm * 2 + arch * width * 0.045 * tip;
    const lift = arch * height * 0.065 * (1 - v) * (0.35 + tip * 0.65);
    return [hingeX + wrapped, y0 + lift, depth];
  }

  const hingeX = width * 0.5;
  const span = Math.max(0, hingeX - x0);
  const spanNorm = span / Math.max(width, 1);
  const wrapped = radius * Math.sin(theta) * spanNorm * 2;
  const depth =
    radius * (1 - Math.cos(theta)) * spanNorm * 2 + arch * width * 0.045 * tip;
  const lift = arch * height * 0.065 * (1 - v) * (0.35 + tip * 0.65);
  return [hingeX - wrapped, y0 + lift, depth];
}

export function updatePageGeometryPositions(
  positions: Float32Array,
  segmentsX: number,
  segmentsY: number,
  width: number,
  height: number,
  progress: number,
  direction: TurnDirection,
): void {
  let index = 0;

  for (let row = 0; row <= segmentsY; row += 1) {
    const v = row / segmentsY;
    for (let col = 0; col <= segmentsX; col += 1) {
      const u = col / segmentsX;
      const curl = computeCurlAmount(u, v, progress, direction);
      const [x, y, z] = deformPageVertex(u, v, width, height, curl, direction);
      positions[index] = x;
      positions[index + 1] = y;
      positions[index + 2] = z;
      index += 3;
    }
  }
}

export function getTurnShadowOpacity(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return smoothstep(p) * 0.42;
}
