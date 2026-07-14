import { projectLonLat } from "../geo/projection.js";

function extractPlaceLabels(nodeList) {
  const allowedPlaceTypes = new Set([
    "city",
    "town",
    "suburb",
    "neighbourhood",
    "village",
  ]);

  const labelList = [];

  for (const node of nodeList) {
    const tags = node.tags || {};
    const name = tags.name;
    const placeType = tags.place;

    if (!name || !placeType) continue;
    if (!allowedPlaceTypes.has(placeType)) continue;

    labelList.push({
      id: node.id,
      name,
      placeType,
      lat: node.lat,
      lon: node.lon,
      x: node.x,
      y: node.y,
    });
  }

  return labelList;
}

function computeWayBoundsFromRefs(nodeRefs, nodesById) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let count = 0;

  for (const ref of nodeRefs) {
    const node = nodesById.get(String(ref));
    if (!node) continue;

    const x = node.x;
    const y = -node.y; // bounds stored in render-world coords (north-up)

    if (typeof x !== "number" || typeof y !== "number") continue;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    count++;
  }

  if (count < 2 || !Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

function isClosedWayRefs(nodeRefs) {
  if (!Array.isArray(nodeRefs) || nodeRefs.length < 3) return false;

  if (String(nodeRefs[0]) === String(nodeRefs[nodeRefs.length - 1])) {
    return true;
  }

  return nodeRefs.length >= 4;
}

function getAreaType(tags = {}) {
  if (tags.leisure === "park") return "park";
  if (tags.landuse === "grass") return "grass";
  if (tags.landuse === "recreation_ground") return "recreation_ground";
  if (tags.landuse === "village_green") return "village_green";
  if (tags.natural === "grassland") return "grassland";
  return null;
}


function detectFormat(fileName, text) {
  
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".osm") || lower.endsWith(".xml")) return "xml";

  // fallback: sniff content
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.startsWith("<")) return "xml";

  return "unknown";
}

function detectJsonType(data) {
  if (Array.isArray(data?.elements)) return "overpass";

  if (
    Array.isArray(data?.roads) ||
    Array.isArray(data?.pois) ||
    Array.isArray(data?.labels) ||
    Array.isArray(data?.areas)
  ) {
    return "processed";
  }

  return "unknown";
}

export async function parseOSMFile(file) {
  const lowerName = file.name.toLowerCase();
  const isXmlLike = lowerName.endsWith(".osm") || lowerName.endsWith(".xml");
  const isJsonLike = lowerName.endsWith(".json");

  const MAX_XML_SIZE_MB = 700;

  if (isXmlLike && file.size > MAX_XML_SIZE_MB * 1024 * 1024) {
    throw new Error(
      `This OSM XML file is too large for the current in-browser parser (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please use a smaller extract or a preprocessed dataset.`
    );
  }

  const text = await file.text();
  const format = detectFormat(file.name, text);

  if (format === "xml") {
    try {
      const result = parseOSMXml(text);
      console.log("Areas detected:", result.areaList?.length || 0);
      return result;
    } catch (error) {
      throw new Error(
        "Failed to parse OSM XML. The file may be malformed or too large for the current browser-based parser."
      );
    }
  }

if (format === "json") {
  try {
    const parsed = JSON.parse(text);
    const jsonType = detectJsonType(parsed);

    let result;

    if (jsonType === "overpass") {
      result = parseOverpassJson(text);
    } else if (jsonType === "processed") {
      result = parseProcessedJson(text);
    } else {
      throw new Error("Unrecognised JSON structure.");
    }

    console.log("Areas detected:", result.areaList?.length || 0);
    return result;
  } catch (error) {
    throw new Error(error?.message || "Failed to parse OSM JSON.");
  }
}

  throw new Error("Unsupported file format. Please use .osm/.xml or .json.");
}

function parseOSMXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error(
  "Failed to parse OSM XML. The file may be malformed or too large for the current browser-based parser."
);
  }

  const nodeEls = doc.querySelectorAll("node");
  const wayEls = doc.querySelectorAll("way");
  const relationEls = doc.querySelectorAll("relation");

  // Build node list + lookup
  const nodeList = [];
  const nodesById = new Map();

  nodeEls.forEach((n) => {
    const id = n.getAttribute("id");
    const lat = parseFloat(n.getAttribute("lat"));
    const lon = parseFloat(n.getAttribute("lon"));

    if (!id || Number.isNaN(lat) || Number.isNaN(lon)) return;

    const { x, y } = projectLonLat(lon, lat);

    const tags = {};
    n.querySelectorAll("tag").forEach((t) => {
      const k = t.getAttribute("k");
      const v = t.getAttribute("v");
      if (k && v) tags[k] = v;
    });

    const node = {
      id: String(id),
      lat,
      lon,
      x,
      y,
      tags,
    };

    nodeList.push(node);
    nodesById.set(String(id), node);
  });

  // Build ways as node reference lists (+ tags)
  const waysList = [];
  const areaList = [];

  wayEls.forEach((w) => {
    const id = w.getAttribute("id");
    if (!id) return;

    const nodeRefs = Array.from(w.querySelectorAll("nd"))
      .map((nd) => nd.getAttribute("ref"))
      .filter(Boolean)
      .map(String);

    if (nodeRefs.length < 2) return;

    // Extract tags: <tag k="highway" v="primary" />
    const tags = {};
    w.querySelectorAll("tag").forEach((t) => {
      const k = t.getAttribute("k");
      const v = t.getAttribute("v");
      if (k && v) tags[k] = v;
    });

    const way = {
      id: String(id),
      nodeRefs,
      tags,
    };

    way.bounds = computeWayBoundsFromRefs(way.nodeRefs, nodesById);

    const areaType = getAreaType(tags);
    if (areaType && isClosedWayRefs(nodeRefs)) {
      areaList.push({
        ...way,
        areaType,
      });
    }

    waysList.push(way);
  });

  const labelList = extractPlaceLabels(nodeList);

  console.log("Parsed XML dataset");
  console.log("Counts:", {
  nodes: nodeList.length,
  ways: waysList.length,
  labels: labelList.length,
});

console.log("First way:", waysList[0]);
console.log("First label:", labelList[0]);

  return {
    format: "xml",
    counts: {
      nodes: nodeEls.length,
      ways: wayEls.length,
      relations: relationEls.length,
    },
    nodeList,
    nodesById,
    waysList,
    areaList,
    labelList,
    poiList: [],
  };
}

function parseOverpassJson(jsonText) {
  let data;

  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  const elements = Array.isArray(data) ? data : data.elements;
  if (!Array.isArray(elements)) {
    throw new Error("JSON does not look like Overpass format (missing elements array).");
  }

  const nodeList = [];
  const nodesById = new Map();
  const waysList = [];
  const areaList = [];

  let nodes = 0;
  let ways = 0;
  let relations = 0;

  for (const el of elements) {
    if (el.type === "node") {
      nodes++;

      if (
        typeof el.id !== "undefined" &&
        typeof el.lat === "number" &&
        typeof el.lon === "number"
      ) {
        const id = String(el.id);
        const { x, y } = projectLonLat(el.lon, el.lat);

        const node = {
          id,
          lat: el.lat,
          lon: el.lon,
          x,
          y,
          tags: el.tags || {},
        };

        nodeList.push(node);
        nodesById.set(id, node);
      }
    } else if (el.type === "way") {
      ways++;

      if (
        typeof el.id !== "undefined" &&
        Array.isArray(el.nodes) &&
        el.nodes.length >= 2
      ) {
        const way = {
          id: String(el.id),
          nodeRefs: el.nodes.map(String),
          tags: el.tags || {},
        };

        waysList.push(way);
      }
    } else if (el.type === "relation") {
      relations++;
    }
  }

  for (const way of waysList) {
    way.bounds = computeWayBoundsFromRefs(way.nodeRefs, nodesById);

    const areaType = getAreaType(way.tags);
    if (areaType && isClosedWayRefs(way.nodeRefs)) {
      areaList.push({
        ...way,
        areaType,
      });
    }
  }

  const labelList = extractPlaceLabels(nodeList);

  console.log("First node:", nodeList[0]);
  console.log("Labels found:", labelList.length);
  console.log("Example label:", labelList[0]);

  console.log("Parsed JSON dataset");
  console.log("Counts:", {
  nodes: nodeList.length,
  ways: waysList.length,
  labels: labelList.length,
});

console.log("First way:", waysList[0]);
console.log("First label:", labelList[0]);

  return {
    format: "json",
    counts: { nodes, ways, relations },
    nodeList,
    nodesById,
    waysList,
    areaList,
    labelList,
    poiList: [],
  };
}

function parseProcessedJson(jsonText) {
  let data;

  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  const roads = Array.isArray(data.roads) ? data.roads : [];
  const pois = Array.isArray(data.pois) ? data.pois : [];
  const labels = Array.isArray(data.labels) ? data.labels : [];
  const areas = Array.isArray(data.areas) ? data.areas : [];

  const waysList = roads.map((road) => {
    const points = Array.isArray(road.points) ? road.points : [];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of points) {
      if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") continue;

      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    const bounds =
      points.length >= 2 && Number.isFinite(minX)
        ? { minX, minY, maxX, maxY }
        : null;

    return {
      id: String(road.id ?? ""),
      nodeRefs: [],
      tags: {
        highway: road.highway || "",
        name: road.name || "",
      },
      points,
      bounds,
    };
  });

  const poiList = pois.map((poi) => ({
    id: String(poi.id ?? ""),
    name: poi.name || "",
    x: poi.x,
    y: poi.y,
    category: poi.category || "poi",
    tags: poi.tags || {},
  }));

  const labelList = labels.map((label) => ({
    id: String(label.id ?? ""),
    name: label.name || "",
    placeType: label.place || label.placeType || "",
    x: label.x,
    y: label.y,
  }));

  const areaList = areas.map((area) => ({
    id: String(area.id ?? ""),
    areaType: area.areaType || "",
    tags: area.tags || {},
    points: Array.isArray(area.points) ? area.points : [],
    bounds: area.bounds || null,
  }));

  console.log("Parsed processed JSON dataset");
  console.log("Counts:", {
    roads: waysList.length,
    pois: poiList.length,
    labels: labelList.length,
    areas: areaList.length,
  });

  console.log("First processed road:", waysList[0]);
  console.log("First processed POI:", poiList[0]);
  console.log("First processed label:", labelList[0]);

  return {
    format: "processed-json",
    counts: {
      nodes: 0,
      ways: waysList.length,
      relations: 0,
    },
    nodeList: [],
    nodesById: new Map(),
    waysList,
    areaList,
    labelList,
    poiList,
  };
}
