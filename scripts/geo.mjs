// Small geometry helpers shared by the build scripts. No dependencies.
const R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;

export function polygons(geometry) {
  if (!geometry) return [];
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += rad(x2 - x1) * (2 + Math.sin(rad(y1)) + Math.sin(rad(y2)));
  }
  return Math.abs((sum * R * R) / 2);
}

/** Area in square kilometres. */
export function areaKm2(geometry) {
  let total = 0;
  for (const poly of polygons(geometry)) {
    total += ringArea(poly[0]);
    for (const hole of poly.slice(1)) total -= ringArea(hole);
  }
  return total / 1e6;
}

export function bbox(geometry) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polygons(geometry))
    for (const [x, y] of poly[0]) {
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    }
  return b;
}

function inRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInGeometry(pt, geometry) {
  for (const poly of polygons(geometry)) {
    if (inRing(pt, poly[0]) && !poly.slice(1).some((h) => inRing(pt, h))) return true;
  }
  return false;
}

/** Great-circle distance in kilometres between [lng, lat] points. */
export function distanceKm(a, b) {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return (2 * R * Math.asin(Math.sqrt(h))) / 1000;
}

/** Distance in km from a point to the edge of a geometry; 0 if inside. */
export function distanceToGeometryKm(pt, geometry) {
  if (pointInGeometry(pt, geometry)) return 0;
  const kx = 111.32 * Math.cos(rad(pt[1]));
  const ky = 110.57;
  let best = Infinity;
  for (const poly of polygons(geometry))
    for (const ring of poly)
      for (let i = 0; i < ring.length - 1; i++) {
        const ax = (ring[i][0] - pt[0]) * kx;
        const ay = (ring[i][1] - pt[1]) * ky;
        const bx = (ring[i + 1][0] - pt[0]) * kx;
        const by = (ring[i + 1][1] - pt[1]) * ky;
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy;
        const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
        const d = Math.hypot(ax + t * dx, ay + t * dy);
        if (d < best) best = d;
      }
  return best;
}

export function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
