// src/main.js

import { setupFileLoader, setLoadStatus, setSummary } from "./ui/fileLoader.js";
import { parseOSMFile } from "./map/osmParser.js";
import { renderMap } from "./render/mapRenderer.js";
import { computeFitViewFromBounds } from "./render/viewFit.js";
import { extractPois } from "./map/poiExtractor.js";
import { buildSpatialIndex, queryVisibleFeatures } from "./map/spatialIndex.js";



const statusEl = document.getElementById("status");
const mapStatusEl = document.getElementById("mapStatus");
const canvas = document.getElementById("mapCanvas");

const searchInput = document.getElementById("searchInput");
const searchResultsEl = document.getElementById("searchResults");

const DEBUG_FLAGS = {
  disableSpatialIndex: false,
  disableCulling: false,
  disableLOD: false,
};

const btnZoomIn = document.getElementById("btnZoomIn");
const btnZoomOut = document.getElementById("btnZoomOut");
const btnReset = document.getElementById("btnReset");
const btnFit = document.getElementById("btnFit");

const btnInfo = document.getElementById("btnInfo");
const infoPanel = document.getElementById("infoPanel");

let lastResult = null;
let spatialIndex = null;
let selectedNode = null;
let selectedPOI = null;
let activeLandmarkPopup = null;

const landmarkMetadata = {
  "Gabon Disaster Memorial": {
    period: "1993",
    summary: "A memorial in Lusaka commemorating the victims of the 1993 Gabon air disaster.",
    significance: "It honours the Zambia national football team and others who lost their lives in the tragedy."
  }
};


const view = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  minScale: 0.001,
  maxScale: 2000000,
};

function getPoiType(poi) {
  return poi.type || poi.category || "unknown";
}

function getPoiScreenPosition(poi, view) {
  return {
    x: poi.x * view.scale + view.offsetX,
    y: -poi.y * view.scale + view.offsetY,
  };
}

function isLandmarkPoi(poi) {
  if (!poi) return false;

  const type = getPoiType(poi);

  return (
    type === "monument" ||
    type === "attraction" ||
    type === "memorial" ||
    type === "historic" ||
    type === "airport" ||
    type === "aerodrome"
  );
}

function findClickedLandmarkPoi(clickX, clickY, poiList, view, poiFilters = {}) {
  if (!Array.isArray(poiList)) return null;

  const hitRadius = 14;

  for (const poi of poiList) {
    if (!poi) continue;
    if (typeof poi.x !== "number" || typeof poi.y !== "number") continue;
    if (!isLandmarkPoi(poi)) continue;

    const screenPos = getPoiScreenPosition(poi, view);
    const dx = clickX - screenPos.x;
    const dy = clickY - screenPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= hitRadius) {
      return poi;
    }
  }

  return null;
}

const landmarkPopupEl = document.getElementById("landmarkPopup");


function updateLandmarkPopup() {
  if (!landmarkPopupEl) return;

  if (!activeLandmarkPopup) {
    landmarkPopupEl.classList.add("hidden");
    landmarkPopupEl.innerHTML = "";
    return;
  }

  const screenPos = getPoiScreenPosition(activeLandmarkPopup, view);
  const meta = landmarkMetadata[activeLandmarkPopup.name] || null;
  const type = getPoiType(activeLandmarkPopup);

  landmarkPopupEl.innerHTML = `
    <h4>${activeLandmarkPopup.name || "Unnamed landmark"}</h4>
    <div class="meta">${type}</div>
    <p>${meta?.summary || "No additional description available."}</p>
    ${meta?.period ? `<p><strong>Period:</strong> ${meta.period}</p>` : ""}
    ${meta?.significance ? `<p><strong>Significance:</strong> ${meta.significance}</p>` : ""}
  `;

  landmarkPopupEl.style.left = `${screenPos.x + 18}px`;
  landmarkPopupEl.style.top = `${screenPos.y - 10}px`;
  landmarkPopupEl.classList.remove("hidden");
}


function zoomAtCanvasPoint(targetScale, centerX, centerY) {
  const newScale = clamp(targetScale, view.minScale, view.maxScale);

  const worldX = (centerX - view.offsetX) / view.scale;
  const worldY = (centerY - view.offsetY) / view.scale;

  view.scale = newScale;
  view.offsetX = centerX - worldX * view.scale;
  view.offsetY = centerY - worldY * view.scale;

  renderCurrentMap();
  setMapStatus(`Zoom: ${view.scale.toFixed(2)}x`);

  console.log("Zoom target:", targetScale, "Applied:", newScale);
}


function resizeCanvasToDisplaySize(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}

function getFilteredResult(result) {
  return getRenderReadyResult(result);
}

function computeProjectedBoundsFromWays(waysList, nodesById) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const way of waysList || []) {
    for (const ref of way.nodeRefs || []) {
      const node = nodesById.get(String(ref));
      if (!node) continue;
      if (typeof node.x !== "number" || typeof node.y !== "number") continue;

      const x = node.x;
      const y = -node.y;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX)) return null;
  return { minX, maxX, minY, maxY };
}

function computeProjectedBoundsFromWaysAndAreas(waysList, areaList, nodesById) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = 0;

  function includePoint(x, y) {
    if (typeof x !== "number" || typeof y !== "number") return;

    // Keep bounds in render-world coordinates (north-up)
    const renderY = -y;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (renderY < minY) minY = renderY;
    if (renderY > maxY) maxY = renderY;

    found++;
  }

  function includeWayLike(item) {
    if (!item) return;

    // NEW: processed JSON path
    if (Array.isArray(item.points) && item.points.length > 0) {
      for (const pt of item.points) {
        if (!pt) continue;
        includePoint(pt.x, pt.y);
      }
      return;
    }

    // OLD: raw OSM path
    if (Array.isArray(item.nodeRefs) && nodesById) {
      for (const ref of item.nodeRefs) {
        const node = nodesById.get(String(ref));
        if (!node) continue;
        includePoint(node.x, node.y);
      }
    }
  }

  for (const way of waysList || []) {
    includeWayLike(way);
  }

  for (const area of areaList || []) {
    includeWayLike(area);
  }

  if (!found) return null;

  return { minX, minY, maxX, maxY };
}

function hasValidWayGeometry(way) {
  if (!way) return false;

  if (Array.isArray(way.points) && way.points.length >= 2) return true;
  if (Array.isArray(way.nodeRefs) && way.nodeRefs.length >= 2) return true;

  return false;
}

function hasValidAreaGeometry(area) {
  if (!area) return false;

  if (Array.isArray(area.points) && area.points.length >= 3) return true;
  if (Array.isArray(area.nodeRefs) && area.nodeRefs.length >= 3) return true;

  return false;
}

function buildRenderData(result) {
  if (!result) return null;

  const majorHighwayTypes = new Set([
    "motorway",
    "trunk",
    "primary",
    "secondary",
    "tertiary",
  ]);
  
  const majorRoadWays = (result.waysList || []).filter(
    (way) =>
      majorHighwayTypes.has(way.highway || way?.tags?.highway) &&
    hasValidWayGeometry(way)
  );

  const areaWays = (result.areaList || []).filter((area) =>
    hasValidAreaGeometry(area)
  );

  const fitBounds = computeProjectedBoundsFromWaysAndAreas(
    majorRoadWays,
    areaWays,
    result.nodesById
  );

  return {
    majorRoadWays,
    areaWays,
    fitBounds,
  };
}

function getRenderReadyResult(result) {
  if (!result) return null;
  if (!result.renderData) return result;

  return {
    ...result,
    waysList: result.renderData.majorRoadWays || [],
    areaList: result.renderData.areaWays || [],
    poiList: result.poiList || [],
    labelList: result.labelList || [],
  };
}

function getWorldBoundsFromView(canvas, view) {
  const left = -view.offsetX / view.scale;
  const top = -view.offsetY / view.scale;
  const right = (canvas.width - view.offsetX) / view.scale;
  const bottom = (canvas.height - view.offsetY) / view.scale;

  return {
    minX: Math.min(left, right),
    minY: Math.min(top, bottom),
    maxX: Math.max(left, right),
    maxY: Math.max(top, bottom),
  };
}

function filterVisibleFeaturesForScale(visible, scale) {
  let ways = visible.ways || [];
  let labels = visible.labels || [];
  let pois = visible.pois || [];
  const areas = visible.areas || [];

  ways = ways.filter((way) => {
    const highway = way.highway || way.tags?.highway;

    if (scale < 0.8) {
      return ["motorway", "trunk", "primary", "secondary"].includes(highway);
    }

    if (scale < 2.0) {
      return ["motorway", "trunk", "primary", "secondary", "tertiary"].includes(highway);
    }

    return true;
  });

  if (scale < 0.8) {
    labels = labels.filter((label) =>
      ["city", "town", "village", "suburb", "airport"].includes(label.placeType)
    );

    // Keep POIs at low zoom for demo clarity
    pois = pois.slice(0, 80);
  } else if (scale < 2.0) {
    labels = labels.slice(0, 120);
    pois = pois.slice(0, 80);
  } else {
    labels = labels.slice(0, 250);
    pois = pois.slice(0, 200);
  }

  return { ways, areas, labels, pois };
}



function renderCurrentMap() {
  if (!lastResult || !canvas) return;

  resizeCanvasToDisplaySize(canvas);

  const filteredResult = getFilteredResult(lastResult);
  if (!filteredResult) return;

  let renderResult = filteredResult;

  console.log("renderCurrentMap base ways:", filteredResult.waysList?.length || 0);
  console.log("renderCurrentMap base pois:", filteredResult.poiList?.length || 0);
  console.log("renderCurrentMap base labels:", filteredResult.labelList?.length || 0);

if (spatialIndex && !DEBUG_FLAGS.disableSpatialIndex) {
  const viewBounds = getWorldBoundsFromView(canvas, view);

  console.log("viewBounds:", viewBounds);
  console.log("view.scale:", view.scale);

  const visible = queryVisibleFeatures(spatialIndex, viewBounds);

  console.log("queryVisibleFeatures result:", {
    ways: visible.ways?.length || 0,
    areas: visible.areas?.length || 0,
    pois: visible.pois?.length || 0,
    labels: visible.labels?.length || 0,
  });

  const reducedVisible = DEBUG_FLAGS.disableLOD
    ? visible
    : filterVisibleFeaturesForScale(visible, view.scale);

  console.log("after scale filter:", {
    ways: reducedVisible.ways?.length || 0,
    areas: reducedVisible.areas?.length || 0,
    pois: reducedVisible.pois?.length || 0,
    labels: reducedVisible.labels?.length || 0,
  });

  renderResult = {
    ...filteredResult,
    waysList: reducedVisible.ways || [],
    areaList: reducedVisible.areas || [],
    labelList: reducedVisible.labels || [],
    poiList: reducedVisible.pois || [],
  };

  console.log("USING spatial index");
  console.log("renderCurrentMap visible ways:", renderResult.waysList.length);
  console.log("renderCurrentMap visible pois:", renderResult.poiList.length);
  console.log("renderCurrentMap visible labels:", renderResult.labelList.length);
}

  renderMap(renderResult, view, {
    selectedNode,
    selectedPOI,
    poiFilters: getPoiFiltersFromUi(),
    showNodes: document.getElementById("toggleNodes")?.checked ?? false,
  }, DEBUG_FLAGS);

  updateLandmarkPopup();
}


function isXmlLikeFile(file) {
  const name = file?.name?.toLowerCase() || "";
  return name.endsWith(".osm") || name.endsWith(".xml");
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function setMapStatus(msg) {
  if (mapStatusEl) mapStatusEl.textContent = msg;
}

function getPoiFiltersFromUi() {
  return {
    showCafes: document.getElementById("toggleCafes")?.checked ?? true,
    showMonuments: document.getElementById("toggleMonuments")?.checked ?? true,
    showAirports: document.getElementById("toggleAirports")?.checked ?? true,
  };
}

function buildSearchIndex(result) {
  const labels = (result.labelList || []).map((label) => ({
    kind: "label",
    id: label.id,
    name: label.name,
    type: label.placeType,
    x: label.x,
    y: label.y,
    raw: label,
  }));

const pois = (result.poiList || []).map((poi) => ({
  kind: "poi",
  id: poi.id,
  name: poi.name || "Unnamed POI",
  type: poi.type || poi.category || "unknown",
  x: poi.x,
  y: poi.y,
  raw: poi,
}));

  return [...labels, ...pois].filter((item) => item.name);
}

function searchIndexItems(query, items) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return items
    .filter((item) => item.name.toLowerCase().includes(q))
    .slice(0, 8);
}

function showSearchResults(results) {
  if (!searchResultsEl) return;

  if (!results.length) {
    searchResultsEl.innerHTML = "";
    searchResultsEl.classList.remove("visible");
    return;
  }

  searchResultsEl.innerHTML = results
    .map(
      (item, index) => `
        <div class="search-result-item" data-index="${index}">
          <div class="search-result-title">${item.name}</div>
          <div class="search-result-meta">${item.kind} • ${item.type}</div>
        </div>
      `
    )
    .join("");

  searchResultsEl.classList.add("visible");
}

function hideSearchResults() {
  if (!searchResultsEl) return;
  searchResultsEl.innerHTML = "";
  searchResultsEl.classList.remove("visible");
}

function focusOnSearchResult(item) {
  if (!item || !canvas) return;

  const targetX = item.x;
  const targetY = -item.y;
  
  let minimumSearchScale = 2; // sensible default
  
  if (item.kind === "poi") {
    minimumSearchScale = 4;
  } else if (item.type === "city") {
    minimumSearchScale = 1.5;
  } else if (item.type === "suburb" || item.type === "neighbourhood") {
    minimumSearchScale = 3;
  }
  
  const desiredScale = clamp(minimumSearchScale, view.minScale, view.maxScale);

  view.scale = clamp(desiredScale, view.minScale, view.maxScale);
  
  view.offsetX = canvas.width / 2 - targetX * view.scale;
  view.offsetY = canvas.height / 2 - targetY * view.scale;

  if (!Number.isFinite(view.scale) || view.scale > 1000) {
  console.warn("Search zoom too large, resetting");
  applyFitToData();
  return;
}

  if (item.kind === "poi") {
    selectedPOI = item.raw;
    selectedNode = null;
    setMapStatus(`Selected POI: ${item.name}`);
  } else {
    selectedPOI = null;
    selectedNode = null;
    setMapStatus(`Focused on place: ${item.name}`);
  }

  renderCurrentMap();
}

console.log("Fit scale:", view.scale);

function applyFitToData() {
  if (!lastResult || !canvas) return;

  const filteredResult = getFilteredResult(lastResult);
  if (!filteredResult) return;

  const projectedBounds =
    lastResult.renderData?.fitBounds ||
    computeProjectedBoundsFromWaysAndAreas(
      filteredResult.waysList,
      filteredResult.areaList,
      filteredResult.nodesById
    );

  console.log("Fit bounds:", projectedBounds);

  if (!projectedBounds) {
    console.warn("No projected bounds available for fit-to-data.");
    return;
  }

  const fitted = computeFitViewFromBounds(projectedBounds, canvas, { padding: 20 });

  console.log("Computed fit view:", fitted);

  view.scale = clamp(fitted.scale, view.minScale, view.maxScale);
  view.offsetX = fitted.offsetX;
  view.offsetY = fitted.offsetY;

  renderCurrentMap();
}

function logStageTime(stageName, startTime) {
  const ms = performance.now() - startTime;
  console.log(`${stageName}: ${ms.toFixed(1)} ms`);
}     

function computeProjectedBounds(nodeList) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const n of nodeList) {
    if (typeof n.x !== "number" || typeof n.y !== "number") continue;

    const x = n.x;
    const y = -n.y;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (!Number.isFinite(minX)) return null;
  return { minX, maxX, minY, maxY };
}

/* ----------------------------
   Buttons
---------------------------- */

btnZoomIn?.addEventListener("click", () => {
  if (!lastResult || !canvas) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  zoomAtCanvasPoint(view.scale * 1.5, centerX, centerY);
});

btnZoomOut?.addEventListener("click", () => {
  if (!lastResult || !canvas) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  zoomAtCanvasPoint(view.scale / 1.5, centerX, centerY);
});

btnFit?.addEventListener("click", () => {
  if (!lastResult) return;
  applyFitToData();
  setMapStatus("Fit to data applied.");
});

btnReset?.addEventListener("click", () => {
  if (!lastResult) return;
  applyFitToData();
  setMapStatus("View reset (fit-to-data).");
});

btnInfo?.addEventListener("click", () => {
  infoPanel?.classList.toggle("hidden");
});

/* ----------------------------
   Toggle Nodes
---------------------------- */

document.getElementById("toggleNodes")?.addEventListener("change", () => {
  if (!lastResult) return;
  renderCurrentMap();
  setMapStatus("Re-rendered (toggle nodes).");
});

document.getElementById("toggleCafes")?.addEventListener("change", () => {
  if (!lastResult) return;
  renderCurrentMap();
});

document.getElementById("toggleMonuments")?.addEventListener("change", () => {
  if (!lastResult) return;
  renderCurrentMap();
});

/* ----------------------------
   OSM FILE WORKER
---------------------------- */

function parseOSMFileInWorker(file) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./worker/osmParseWorker.js", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event) => {
      const data = event.data || {};

      if (data.type === "status") {
        setLoadStatus(data.message);
        return;
      }

      if (data.type === "success") {
        console.log(`worker parseOSMFile: ${data.timings.parseMs.toFixed(1)} ms`);
        worker.terminate();
        resolve(data.result);
        return;
      }

      if (data.type === "error") {
        console.error("Worker reported error:", data.message);
        worker.terminate();
        reject(new Error(data.message || "Worker failed."));
      }
    };

    worker.onerror = (event) => {
      console.error("Worker onerror event:", event);
      console.error("Worker message:", event.message);
      console.error("Worker filename:", event.filename);
      console.error("Worker line/col:", event.lineno, event.colno);

      worker.terminate();
      reject(
        new Error(
          event.message ||
            `Worker crashed at ${event.filename}:${event.lineno}:${event.colno}`
        )
      );
    };

    worker.onmessageerror = (event) => {
      console.error("Worker message transfer failed:", event);
      worker.terminate();
      reject(new Error("Worker message transfer failed."));
    };

    worker.postMessage({ file });
  });
}


/* ----------------------------
   Pan + Zoom (Canvas)
---------------------------- */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function findNearestNode(wx, wy, view, nodeList) {
  const thresholdPx = 12;
  const thresholdWorld = thresholdPx / view.scale;
  const threshold2 = thresholdWorld * thresholdWorld;

  let best = null;
  let bestD2 = threshold2;

  for (const n of nodeList || []) {
    if (typeof n.x !== "number" || typeof n.y !== "number") continue;

    const nx = n.x;
    const ny = -n.y;

    const dx = nx - wx;
    const dy = ny - wy;
    const d2 = dx * dx + dy * dy;

    if (d2 <= bestD2) {
      bestD2 = d2;
      best = n;
    }
  }

  return best;
}

function findNearestPoi(wx, wy, view, poiList) {
  const thresholdPx = 12;
  const thresholdWorld = thresholdPx / view.scale;
  const threshold2 = thresholdWorld * thresholdWorld;

  let best = null;
  let bestD2 = threshold2;

  for (const poi of poiList || []) {
    if (typeof poi.x !== "number" || typeof poi.y !== "number") continue;

    const px = poi.x;
    const py = -poi.y;

    const dx = px - wx;
    const dy = py - wy;
    const d2 = dx * dx + dy * dy;

    if (d2 <= bestD2) {
      bestD2 = d2;
      best = poi;
    }
  }

  return best;
}

if (canvas) {
  // --- Drag to pan ---
  let dragging = false;
  let startCanvasX = 0;
  let startCanvasY = 0;
  let startOffsetX = 0;
  let startOffsetY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    if (!lastResult) return;

    dragging = true;
    canvas.setPointerCapture(e.pointerId);

    const pt = getCanvasPoint(e, canvas);
    startCanvasX = pt.x;
    startCanvasY = pt.y;
    startOffsetX = view.offsetX;
    startOffsetY = view.offsetY;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const pt = getCanvasPoint(e, canvas);
    const dx = pt.x - startCanvasX;
    const dy = pt.y - startCanvasY;

    view.offsetX = startOffsetX + dx;
    view.offsetY = startOffsetY + dy;

    renderCurrentMap();

    setMapStatus(
      `Panning… offset=(${Math.round(view.offsetX)}, ${Math.round(view.offsetY)})`
    );
  });

  function endDrag() {
    dragging = false;
  }

  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", endDrag);

  // --- Wheel / touchpad zoom ---
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (!lastResult) return;

      e.preventDefault();

      const { x: mouseX, y: mouseY } = getCanvasPoint(e, canvas);

      const zoomIn = e.deltaY < 0;
      const factor = zoomIn ? 1.2 : 1 / 1.2;

      zoomAtCanvasPoint(view.scale * factor, mouseX, mouseY);
    },
    { passive: false }
  );

  // --- Double click / double tap-to-click zoom ---
  canvas.addEventListener("dblclick", (e) => {
    if (!lastResult) return;

    e.preventDefault();

    const { x, y } = getCanvasPoint(e, canvas);
    const factor = e.shiftKey ? 1 / 1.5 : 1.5;

    zoomAtCanvasPoint(view.scale * factor, x, y);
  });

  // --- Click selection ---
canvas.addEventListener("click", (e) => {
  if (!lastResult) return;

  const { x: sx, y: sy } = getCanvasPoint(e, canvas);

  const wx = (sx - view.offsetX) / view.scale;
  const wy = (sy - view.offsetY) / view.scale;

  const poiFilters = getPoiFiltersFromUi();

  // Try exact landmark click first
  const clickedLandmark = findClickedLandmarkPoi(sx, sy, lastResult.poiList, view, poiFilters);

  if (clickedLandmark) {
    selectedPOI = clickedLandmark;
    selectedNode = null;
    activeLandmarkPopup = clickedLandmark;

    console.log("Clicked landmark:", clickedLandmark);
    console.log("Landmark type:", getPoiType(clickedLandmark));
    console.log("Landmark name:", clickedLandmark.name);

    setMapStatus(`Selected landmark: ${clickedLandmark.name || "Unnamed"}`);
    renderCurrentMap();
    return;
  }

  // Fallback to regular POI selection
  const hitPoi = findNearestPoi(wx, wy, view, lastResult.poiList);

  if (hitPoi) {
    selectedPOI = hitPoi;
    selectedNode = null;
    activeLandmarkPopup = null;

    console.log("Clicked POI:", hitPoi);
    console.log("POI type:", getPoiType(hitPoi));
    console.log("POI name:", hitPoi.name);

    setMapStatus(`Selected POI: ${selectedPOI.name || "Unnamed"} (${getPoiType(hitPoi)})`);
  } else {
    selectedPOI = null;
    activeLandmarkPopup = null;

    selectedNode = findNearestNode(wx, wy, view, lastResult.nodeList);

    setMapStatus(
      selectedNode
        ? `Selected node: ${selectedNode.id}`
        : "Nothing selected"
    );
  }

  renderCurrentMap();
});
}

window.addEventListener("resize", () => {
  if (!lastResult) return;
  renderCurrentMap();
});

let currentSearchResults = [];

searchInput?.addEventListener("input", () => {
  if (!lastResult) return;

  const query = searchInput.value.trim();
  if (!query) {
    currentSearchResults = [];
    hideSearchResults();
    return;
  }

  const index = lastResult.searchIndex || [];
  currentSearchResults = searchIndexItems(query, index);
  showSearchResults(currentSearchResults);
});

searchResultsEl?.addEventListener("click", (e) => {
  const itemEl = e.target.closest(".search-result-item");
  if (!itemEl) return;

  const index = Number(itemEl.dataset.index);
  const item = currentSearchResults[index];
  if (!item) return;

  focusOnSearchResult(item);
  searchInput.value = item.name;
  hideSearchResults();
});

document.addEventListener("click", (e) => {
  const clickedInsideSearch =
    e.target === searchInput || searchResultsEl?.contains(e.target);

  if (!clickedInsideSearch) {
    hideSearchResults();
  }
});

/* ----------------------------
   File Loading
---------------------------- */

setupFileLoader({
  onFileSelected: async (file) => {
    try {
      const overallStart = performance.now();
      spatialIndex = null;

      setLoadStatus(`Reading file: ${file.name}...`);
      
      const parseStart = performance.now();
      let result;
      
      if (isXmlLikeFile(file)) {
        setLoadStatus(`Parsing XML on main thread: ${file.name}...`);
        result = await parseOSMFile(file);
      } else {
        setLoadStatus(`Parsing in worker: ${file.name}...`);
        result = await parseOSMFileInWorker(file);
      }
      
      logStageTime("parseOSMFile", parseStart);

      setLoadStatus("OSM parsed. Preparing summary...");

      setLoadStatus(`Loaded ${file.name} (${result.format.toUpperCase()})`);

      const { nodes, ways, relations } = result.counts;
      setSummary(`
        <strong>Summary</strong><br/>
        Nodes: ${nodes}<br/>
        Ways: ${ways}<br/>
        Relations: ${relations}
      `);
      
      setLoadStatus("Extracting POIs...");
      const poiStart = performance.now();
      
      if (!Array.isArray(result.poiList) || result.poiList.length === 0) {
        result.poiList = extractPois(result);
      } else {
        console.log("Using preprocessed poiList:", result.poiList.length);
      }
      
      logStageTime("extractPois", poiStart);

      setLoadStatus("Building search index...");
      const searchIndexStart = performance.now();
      const prebuiltSearchIndex = buildSearchIndex(result);
      logStageTime("buildSearchIndex", searchIndexStart);

      result.searchIndex = prebuiltSearchIndex;
      
      setLoadStatus("Preparing render data...");
      const renderPrepStart = performance.now();
      result.renderData = buildRenderData(result);
      logStageTime("buildRenderData", renderPrepStart);
      
      setLoadStatus("Building spatial index...");
      const spatialIndexStart = performance.now();
      const filteredForIndex = getRenderReadyResult(result);
      
      console.log("Spatial index input ways:", filteredForIndex?.waysList?.length || 0);
      console.log("Spatial index input pois:", filteredForIndex?.poiList?.length || 0);
      console.log("Spatial index input labels:", filteredForIndex?.labelList?.length || 0);
      
      spatialIndex = buildSpatialIndex(filteredForIndex, { cellSize: 2000 });
      logStageTime("buildSpatialIndex", spatialIndexStart);
      
      lastResult = result;

      selectedNode = null;
      selectedPOI = null;

      window.lastResult = lastResult;

      if (searchInput) searchInput.value = "";
      hideSearchResults();

      console.log("POIs found:", lastResult.poiList.length);
      console.log("Example POI:", lastResult.poiList[0]);
      console.log("Example node:", result.nodeList[0]);
      console.log("Example way:", result.waysList[0]);
      console.log("Render data:", result.renderData);
      console.log("Major road ways:", result.renderData?.majorRoadWays?.length || 0);
      console.log("Area ways:", result.renderData?.areaWays?.length || 0);
      console.log("Fit bounds:", result.renderData?.fitBounds);

      const cafeWay = window.lastResult.waysList.find(
        (w) => w.tags?.amenity === "cafe"
      );

      const monumentWay = window.lastResult.waysList.find(
        (w) => w.tags?.historic === "monument" || w.tags?.tourism === "attraction"
      );

      const taggedNode = window.lastResult.nodeList.find((n) => n.tags);
      console.log("Cafe way:", cafeWay);
      console.log("Monument way:", monumentWay);
      console.log("Tagged node:", taggedNode);

      if (btnReset) btnReset.disabled = false;
      if (btnFit) btnFit.disabled = false;

      setLoadStatus("Resizing canvas...");
      const resizeStart = performance.now();
      resizeCanvasToDisplaySize(canvas);
      logStageTime("resizeCanvasToDisplaySize", resizeStart);

      setLoadStatus("Fitting map to data and rendering...");
      const renderStart = performance.now();
      applyFitToData();
      logStageTime("applyFitToData + first render", renderStart);

      logStageTime("TOTAL LOAD PIPELINE", overallStart);

      setLoadStatus(`Map ready: ${file.name}`);
      setMapStatus("Rendered highways (auto-fit). Drag to pan, wheel to zoom.");
    } catch (error) {
      console.error("File load failed:", error);
      spatialIndex = null;
      setLoadStatus("Failed to load file.");
      setMapStatus("Error while loading map data.");
    }
  },
});