export type TurnDirection = "next" | "prev";

const BEZIER_X1 = 0.22;
const BEZIER_Y1 = 1;
const BEZIER_X2 = 0.36;
const BEZIER_Y2 = 1;

function cubicBezierComponent(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function cubicBezierEase(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  let low = 0;
  let high = 1;

  for (let i = 0; i < 12; i += 1) {
    const mid = (low + high) * 0.5;
    const x = cubicBezierComponent(mid, 0, BEZIER_X1, BEZIER_X2, 1);
    if (x < clamped) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const param = (low + high) * 0.5;
  return cubicBezierComponent(param, 0, BEZIER_Y1, BEZIER_Y2, 1);
}

export function computeCurlAmount(
  u: number,
  v: number,
  progress: number,
  direction: TurnDirection,
): number {
  const reach = 2 * Math.max(0, Math.min(1, progress));
  if (reach <= 0) {
    return 0;
  }

  if (direction === "next") {
    const cornerDist = (1 - u) + v;
    if (cornerDist > reach) {
      return 0;
    }
    return cubicBezierEase((reach - cornerDist) / reach);
  }

  const cornerDist = u + v;
  if (cornerDist > reach) {
    return 0;
  }
  return cubicBezierEase((reach - cornerDist) / reach);
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

  const eased = curl;
  const arch = Math.sin(eased * Math.PI);
  const radius = width * (0.26 + arch * 0.1);
  const edgeBias = direction === "next" ? 1 - u : u;
  const theta =
    eased * Math.PI * 0.5 * (0.82 + edgeBias * 0.18 + v * 0.08);

  if (direction === "next") {
    const hingeX = -width * 0.5;
    const span = x0 - hingeX;
    const wrapped = radius * Math.sin(theta) * (span / Math.max(width, 1));
    const depth = radius * (1 - Math.cos(theta)) + arch * width * 0.05;
    const lift = arch * height * 0.035 * (1 - v);
    return [hingeX + wrapped, y0 + lift, depth];
  }

  const hingeX = width * 0.5;
  const span = hingeX - x0;
  const wrapped = radius * Math.sin(theta) * (span / Math.max(width, 1));
  const depth = radius * (1 - Math.cos(theta)) + arch * width * 0.05;
  const lift = arch * height * 0.035 * (1 - v);
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
