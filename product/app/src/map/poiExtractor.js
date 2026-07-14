// product/app/src/map/poiExtractor.js

function classifyPoi(tags = {}) {
  if (tags.amenity === "cafe") {
    return "cafe";
  }

  if (tags.historic === "monument") {
    return "monument";
  }

  if (tags.tourism === "attraction") {
    return "attraction";
  }

  return null;
}

function makeNodePoi(node, type) {
  return {
    id: node.id,
    name: node.tags?.name || null,
    type,
    lon: node.lon,
    lat: node.lat,
    x: node.x,
    y: node.y,
    source: "node",
  };
}

function makeWayPoi(way, nodesById, type) {
  if (!Array.isArray(way.nodeRefs)) return null;

  for (const ref of way.nodeRefs) {
    const node = nodesById?.get(String(ref));
    if (!node) continue;

    return {
      id: way.id,
      name: way.tags?.name || null,
      type,
      lon: node.lon,
      lat: node.lat,
      x: node.x,
      y: node.y,
      source: "way",
    };
  }

  return null;
}

export function extractPois(result) {
  const pois = [];
  const seen = new Set();

  // 1. Tagged nodes
  for (const node of result.nodeList || []) {
    if (!node?.tags) continue;

    const type = classifyPoi(node.tags);
    if (!type) continue;

    const key = `node:${node.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    pois.push(makeNodePoi(node, type));
  }

  // 2. Tagged ways
  for (const way of result.waysList || []) {
    if (!way?.tags) continue;

    const type = classifyPoi(way.tags);
    if (!type) continue;

    const poi = makeWayPoi(way, result.nodesById, type);
    if (!poi) continue;

    const key = `way:${way.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    pois.push(poi);
  }

  return pois;
}