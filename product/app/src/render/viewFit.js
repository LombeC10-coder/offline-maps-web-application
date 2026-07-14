// src/render/viewFit.js

/**
 * Compute a "fit-to-data" view (scale + offsets) from projected bounds (x/y).
 * IMPORTANT: Do NOT clamp scale here.
 * Clamp only during interactive wheel zoom.
 */
export function computeFitViewFromBounds(bounds, canvas, opts = {}) {
  const padding = opts.padding ?? 20;

  if (!bounds || !canvas) return { scale: 1, offsetX: 0, offsetY: 0 };

  const { minX, maxX, minY, maxY } = bounds;

  const worldW = (maxX - minX) || 1;
  const worldH = (maxY - minY) || 1;

  const cw = Math.max(1, canvas.width - padding * 2);
  const ch = Math.max(1, canvas.height - padding * 2);

  // Fit scale (preserve aspect ratio)
  const scale = Math.min(cw / worldW, ch / worldH);

  // Center dataset in canvas (include padding)
  const offsetX = (canvas.width - worldW * scale) / 2 - minX * scale;
  const offsetY = (canvas.height - worldH * scale) / 2 - minY * scale;

  return { scale, offsetX, offsetY };
}
