// src/map/spatialIndex.js

function cellKey(col, row) {
  return `${col},${row}`;
}

function getCellCoord(value, cellSize) {
  return Math.floor(value / cellSize);
}

function getWayBoundsFromNodeRefs(nodeRefs, nodesById) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const ref of nodeRefs || []) {
    const node = nodesById.get(String(ref));
    if (!node) continue;
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;

    const x = node.x;
    const y = -node.y; // match your current world/view coordinate system

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  if (!Number.isFinite(minX)) return null;

  return { minX, minY, maxX, maxY };
}



function insertIntoGrid(grid, feature, type, bounds, cellSize) {
  if (!bounds) return;

  const minCol = getCellCoord(bounds.minX, cellSize);
  const maxCol = getCellCoord(bounds.maxX, cellSize);
  const minRow = getCellCoord(bounds.minY, cellSize);
  const maxRow = getCellCoord(bounds.maxY, cellSize);

  for (let col = minCol; col <= maxCol; col++) {
    for (let row = minRow; row <= maxRow; row++) {
      const key = cellKey(col, row);

      if (!grid.has(key)) {
        grid.set(key, {
          ways: [],
          areas: [],
          labels: [],
          pois: [],
        });
      }

      grid.get(key)[type].push(feature);
    }
  }
}

function getBoundsFromPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    
    const x = p.x;
    const y = -p.y; // 🔥 IMPORTANT
    
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  if (
    minX === Infinity ||
    minY === Infinity ||
    maxX === -Infinity ||
    maxY === -Infinity
  ) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function getFeatureBounds(feature, nodesById) {
  if (feature?.points?.length) {
    return getBoundsFromPoints(feature.points);
  }

  if (feature?.nodeRefs?.length && nodesById) {
    return getWayBoundsFromNodeRefs(feature.nodeRefs, nodesById);
  }

  if (Number.isFinite(feature?.x) && Number.isFinite(feature?.y)) {
    return {
      minX: feature.x,
      minY: -feature.y,
      maxX: feature.x,
      maxY: -feature.y,
    };
  }

  return null;
}

export function buildSpatialIndex(result, options = {}) {
  const cellSize = options.cellSize ?? 2000;
  const grid = new Map();
  const nodesById = result.nodesById;

  let insertedWays = 0;
  let insertedAreas = 0;
  let insertedLabels = 0;
  let insertedPois = 0;
  
  for (const way of result.waysList || []) {
    const bounds = getFeatureBounds(way, nodesById);
    if (!bounds) continue;
    way.bounds = bounds;
    insertIntoGrid(grid, way, "ways", bounds, cellSize);
    insertedWays++;
  }

  for (const area of result.areaList || []) {
    const bounds = getFeatureBounds(area, nodesById);
    if (!bounds) continue;
    insertIntoGrid(grid, area, "areas", bounds, cellSize);
    insertedAreas++;
  }

  for (const label of result.labelList || []) {
    const bounds = getFeatureBounds(label, nodesById);
    if (!bounds) continue;
    insertIntoGrid(grid, label, "labels", bounds, cellSize);
    insertedLabels++;
  }

  for (const poi of result.poiList || []) {
    const bounds = getFeatureBounds(poi, nodesById);
    if (!bounds) continue;
    insertIntoGrid(grid, poi, "pois", bounds, cellSize);
    insertedPois++;
  }

  console.log("Spatial index inserted ways:", insertedWays);
  console.log("Spatial index inserted areas:", insertedAreas);
  console.log("Spatial index inserted labels:", insertedLabels);
  console.log("Spatial index inserted pois:", insertedPois);

  return {
    cellSize,
    grid,
  };
}

export function queryVisibleFeatures(index, viewBounds) {
  if (!index || !index.grid || !viewBounds) {
    return {
      ways: [],
      areas: [],
      labels: [],
      pois: [],
    };
  }

  const minCol = getCellCoord(viewBounds.minX, index.cellSize);
  const maxCol = getCellCoord(viewBounds.maxX, index.cellSize);
  const minRow = getCellCoord(viewBounds.minY, index.cellSize);
  const maxRow = getCellCoord(viewBounds.maxY, index.cellSize);

  const ways = new Set();
  const areas = new Set();
  const labels = new Set();
  const pois = new Set();

  for (let col = minCol; col <= maxCol; col++) {
    for (let row = minRow; row <= maxRow; row++) {
      const key = cellKey(col, row);
      const cell = index.grid.get(key);
      if (!cell) continue;

      for (const way of cell.ways) ways.add(way);
      for (const area of cell.areas) areas.add(area);
      for (const label of cell.labels) labels.add(label);
      for (const poi of cell.pois) pois.add(poi);
    }
  }

  return {
    ways: Array.from(ways),
    areas: Array.from(areas),
    labels: Array.from(labels),
    pois: Array.from(pois),
  };
}