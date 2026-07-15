export const MAP_ZOOM_LEVELS = Object.freeze([0.75, 1, 1.25, 1.5, 1.75, 2]);
export const DEFAULT_MAP_ZOOM = 1;
export const FIT_MAP_ZOOM = "fit";
export const FOUNDATION_MAP_ZOOM_STORAGE_KEY = "zizi-el-alamein-foundation-map-zoom-v2";

const MAP_ZOOM_EPSILON = 1e-9;

/**
 * Clamps and snaps a persisted map zoom value to a supported UI step.
 *
 * @param {unknown} value Candidate zoom value.
 * @returns {number} Supported zoom multiplier.
 */
export function normalizeMapZoom(value) {
  if (value === null || value === undefined || value === "") return DEFAULT_MAP_ZOOM;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_MAP_ZOOM;
  return MAP_ZOOM_LEVELS.reduce((nearest, level) => (
    Math.abs(level - numeric) < Math.abs(nearest - numeric) ? level : nearest
  ), MAP_ZOOM_LEVELS[0]);
}

/**
 * Keeps a continuous fitted zoom inside the same legal 75%-200% range.
 */
export function clampMapZoom(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_MAP_ZOOM;
  return Math.max(MAP_ZOOM_LEVELS[0], Math.min(MAP_ZOOM_LEVELS[MAP_ZOOM_LEVELS.length - 1], numeric));
}

export function normalizeMapZoomPreference(value) {
  if (value === null || value === undefined || value === "" || value === FIT_MAP_ZOOM) return FIT_MAP_ZOOM;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? normalizeMapZoom(numeric) : FIT_MAP_ZOOM;
}

/**
 * Reads only the Foundation namespace. The former shared v1 key is
 * intentionally ignored so Alpha and Online preferences cannot leak here.
 */
export function readFoundationMapZoomPreference(storage) {
  try {
    return normalizeMapZoomPreference(storage?.getItem?.(FOUNDATION_MAP_ZOOM_STORAGE_KEY));
  } catch (_) {
    return FIT_MAP_ZOOM;
  }
}

export function calculateFitMapZoom({ viewportWidth, viewportHeight, mapWidth, mapHeight } = {}) {
  const availableWidth = finiteNumber(viewportWidth);
  const availableHeight = finiteNumber(viewportHeight);
  const naturalWidth = finiteNumber(mapWidth);
  const naturalHeight = finiteNumber(mapHeight);
  if (availableWidth <= 0 || availableHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
    return DEFAULT_MAP_ZOOM;
  }
  return clampMapZoom(Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight));
}

/**
 * Moves one step through the fixed map zoom scale.
 *
 * @param {unknown} current Current zoom value.
 * @param {number} direction Negative to zoom out, positive to zoom in.
 * @returns {number} Next supported zoom multiplier.
 */
export function stepMapZoom(current, direction) {
  const value = clampMapZoom(current);
  if (Number(direction) > 0) {
    return MAP_ZOOM_LEVELS.find((level) => level > value + MAP_ZOOM_EPSILON)
      ?? MAP_ZOOM_LEVELS[MAP_ZOOM_LEVELS.length - 1];
  }
  if (Number(direction) < 0) {
    return [...MAP_ZOOM_LEVELS].reverse().find((level) => level < value - MAP_ZOOM_EPSILON)
      ?? MAP_ZOOM_LEVELS[0];
  }
  return normalizeMapZoom(value);
}

export function formatMapZoom(value) {
  return `${Math.round(clampMapZoom(value) * 100)}%`;
}

export function mapZoomStageSize({ width, height, zoom } = {}) {
  const normalized = clampMapZoom(zoom);
  return {
    width: Math.max(0, Math.round(finiteNumber(width) * normalized)),
    height: Math.max(0, Math.round(finiteNumber(height) * normalized)),
  };
}

/**
 * Calculates scroll offsets that keep the same map coordinate at the center
 * after the map surface changes scale.
 */
export function preserveMapViewportCenter({
  scrollLeft = 0,
  scrollTop = 0,
  clientWidth = 0,
  clientHeight = 0,
  currentZoom = DEFAULT_MAP_ZOOM,
  nextZoom = DEFAULT_MAP_ZOOM,
} = {}) {
  const current = clampMapZoom(currentZoom);
  const next = clampMapZoom(nextZoom);
  const width = finiteNumber(clientWidth);
  const height = finiteNumber(clientHeight);
  const centerX = (finiteNumber(scrollLeft) + width / 2) / current;
  const centerY = (finiteNumber(scrollTop) + height / 2) / current;
  return {
    scrollLeft: Math.max(0, centerX * next - width / 2),
    scrollTop: Math.max(0, centerY * next - height / 2),
  };
}

function finiteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}
