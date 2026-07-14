// src/render/mapRenderer.js

function getHighwayStyle(highway) {
  switch (highway) {
    case "motorway":
    case "trunk":
      return { width: 3.5, color: "#d9534f", alpha: 0.95 };

    case "primary":
      return { width: 3.0, color: "#f0ad4e", alpha: 0.95 };

    case "secondary":
      return { width: 2.4, color: "#f7c873", alpha: 0.9 };

    case "tertiary":
      return { width: 2.0, color: "#f5dba7", alpha: 0.85 };

    case "residential":
    case "unclassified":
    case "service":
      return { width: 1.4, color: "#ffffff", alpha: 0.9 };

    case "footway":
    case "path":
    case "track":
      return { width: 1.0, color: "#cfcfcf", alpha: 0.7 };

    default:
      return { width: 1.2, color: "#e0e0e0", alpha: 0.6 };
  }
}

function getPoiType(poi) {
  return poi?.type || poi?.category || "unknown";
}

function getPoiStyle(type) {
  switch (type) {
    case "cafe":
    case "restaurant":
      return {
        fill: "#b8742a",
        stroke: "#6b3f12",
        icon: "☕",
        radius: 8,
      };

    case "monument":
    case "attraction":
      return {
        fill: "#6f42c1",
        stroke: "#3d1d78",
        icon: "🏛",
        radius: 9,
      };

    case "airport":
    case "aerodrome":
      return {
        fill: "#1976d2",
        stroke: "#0d47a1",
        icon: "✈",
        radius: 9,
      };

    default:
      return {
        fill: "#444",
        stroke: "#111",
        icon: "•",
        radius: 7,
      };
  }
}

function getPolygonStyle(tags = {}, areaType = null) {
  const resolvedType =
    areaType ||
    (tags.leisure === "park" ? "park" : null) ||
    (tags.landuse === "grass" ? "grass" : null) ||
    (tags.landuse === "recreation_ground" ? "recreation_ground" : null) ||
    (tags.landuse === "village_green" ? "village_green" : null) ||
    (tags.natural === "grassland" ? "grassland" : null);

  switch (resolvedType) {
    case "park":
      return { fill: "#cfe8c6", stroke: "#a8cfa0", alpha: 0.6 };

    case "grass":
    case "grassland":
    case "village_green":
      return { fill: "#d9f0d3", stroke: "#b8ddb2", alpha: 0.55 };

    case "recreation_ground":
      return { fill: "#d4ebcc", stroke: "#b2d6a8", alpha: 0.58 };

    default:
      return null;
  }
}

function getLabelStyle(placeType) {
  switch (placeType) {
    case "city":
      return { fontSize: 28, color: "#1f1f1f" };

    case "town":
      return { fontSize: 22, color: "#2a2a2a" };

    case "suburb":
      return { fontSize: 18, color: "#3a3a3a" };

    case "neighbourhood":
      return { fontSize: 15, color: "#555" };

    case "village":
      return { fontSize: 16, color: "#4f4f4f" };

    default:
      return { fontSize: 14, color: "#555" };
  }
}

function isPoiTypeVisible(poi, poiFilters = {}) {
  const {
    showCafes = true,
    showMonuments = true,
    showAirports = true,
  } = poiFilters;

  const poiType = getPoiType(poi);

  if (poiType === "cafe" || poiType === "restaurant") {
    return showCafes;
  }

  if (poiType === "monument" || poiType === "attraction") {
    return showMonuments;
  }

  if (poiType === "airport" || poiType === "aerodrome") {
    return showAirports;
  }

  return true;
}

function isPoiInViewport(poi, viewport, padWorld = 0) {
  const x = poi.x;
  const y = -poi.y;

  return (
    x >= viewport.minX - padWorld &&
    x <= viewport.maxX + padWorld &&
    y >= viewport.minY - padWorld &&
    y <= viewport.maxY + padWorld
  );
}

function isLabelInViewport(label, viewport, padWorld = 0) {
  const x = label.x;
  const y = -label.y;

  return (
    x >= viewport.minX - padWorld &&
    x <= viewport.maxX + padWorld &&
    y >= viewport.minY - padWorld &&
    y <= viewport.maxY + padWorld
  );
}

function shouldRenderPoiLabel(poi, scale) {
  const type = getPoiType(poi);

  if (type === "airport" || type === "aerodrome") return true;
  if (type === "monument" || type === "attraction") return true;
  if (type === "cafe" || type === "restaurant") return true;

  return scale >= 0.02;
}

function shouldRenderPoiMarker(poi, scale) {
  const type = getPoiType(poi);

  if (type === "airport" || type === "aerodrome") return true;
  if (type === "monument" || type === "attraction") return true;
  if (type === "cafe" || type === "restaurant") return true;

  return scale >= 0.02;
}

function shouldRenderLabel(_placeType, _scale) {
  return true;
}

function intersectsAABB(a, b) {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

function getVisibleWorldBounds(canvas, view) {
  const { scale, offsetX, offsetY } = view;

  const x0 = (0 - offsetX) / scale;
  const y0 = (0 - offsetY) / scale;
  const x1 = (canvas.width - offsetX) / scale;
  const y1 = (canvas.height - offsetY) / scale;

  return {
    minX: Math.min(x0, x1),
    maxX: Math.max(x0, x1),
    minY: Math.min(y0, y1),
    maxY: Math.max(y0, y1),
  };
}

function getWayPointList(way, nodesById) {
  if (Array.isArray(way?.points) && way.points.length > 0) {
    return way.points
      .filter((pt) => pt && typeof pt.x === "number" && typeof pt.y === "number")
      .map((pt) => ({
        x: pt.x,
        y: -pt.y,
      }));
  }

  if (Array.isArray(way?.nodeRefs) && way.nodeRefs.length > 0) {
    return way.nodeRefs
      .map((ref) => nodesById?.get(String(ref)))
      .filter((node) => node && typeof node.x === "number" && typeof node.y === "number")
      .map((node) => ({
        x: node.x,
        y: -node.y,
      }));
  }

  return [];
}

function hasDrawableWayGeometry(way, nodesById) {
  return getWayPointList(way, nodesById).length >= 2;
}

function hasDrawablePolygonGeometry(way, nodesById) {
  return getWayPointList(way, nodesById).length >= 3;
}

function computeWayBounds(way, nodesById) {
  const points = getWayPointList(way, nodesById);
  if (points.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  if (!Number.isFinite(minX)) return null;

  return { minX, maxX, minY, maxY };
}

export function computeProjectedBounds(result) {
  const ways = result?.waysList || [];
  const areas = result?.areaList || [];
  const nodesById = result?.nodesById;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let found = 0;

  function includeWayLike(item) {
    const points = getWayPointList(item, nodesById);

    for (const pt of points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
      found++;
    }
  }

  for (const way of ways) includeWayLike(way);
  for (const area of areas) includeWayLike(area);

  if (!found) return null;

  return { minX, maxX, minY, maxY };
}

function drawPoiMarker(ctx, poi, view, isSelected = false) {
  const poiType = getPoiType(poi);
  const style = getPoiStyle(poiType);

  const worldX = poi.x;
  const worldY = -poi.y;
  const screenX = worldX * view.scale + view.offsetX;
  const screenY = worldY * view.scale + view.offsetY;

  const baseRadius = style.radius || 8;
  const radius = isSelected ? baseRadius + 3 : baseRadius;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.globalAlpha = 0.95;
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = isSelected ? 2.5 : 1.5;

  ctx.beginPath();
  ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = isSelected
    ? "13px system-ui, sans-serif"
    : "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.icon, screenX, screenY);

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();

  return { screenX, screenY };
}

function drawPoiLabel(ctx, poi, markerScreenPos) {
  if (!poi?.name) return;

  const { screenX, screenY } = markerScreenPos;
  const labelX = screenX + 16;
  const labelY = screenY;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.fillStyle = "#111";

  ctx.strokeText(poi.name, labelX, labelY);
  ctx.fillText(poi.name, labelX, labelY);

  ctx.restore();
}

function renderPois(ctx, poiList, view, viewport, poiFilters = {}, selectedPOI = null) {
  if (!Array.isArray(poiList) || poiList.length === 0) return 0;

  const padPx = 30;
  const padWorld = padPx / view.scale;
  let drawn = 0;

  for (const poi of poiList) {
    if (!poi) continue;
    if (typeof poi.x !== "number" || typeof poi.y !== "number") continue;
    if (!isPoiTypeVisible(poi, poiFilters)) continue;
    if (!isPoiInViewport(poi, viewport, padWorld)) continue;

    const isSelected = selectedPOI && selectedPOI.id === poi.id;

    if (!shouldRenderPoiMarker(poi, view.scale) && !isSelected) continue;

    const markerScreenPos = drawPoiMarker(ctx, poi, view, isSelected);

    if (shouldRenderPoiLabel(poi, view.scale) || isSelected) {
      drawPoiLabel(ctx, poi, markerScreenPos);
    }

    drawn++;
  }

  return drawn;
}

function renderLabels(ctx, labelList, view, viewport) {
  if (!Array.isArray(labelList) || labelList.length === 0) return 0;

  const padPx = 20;
  const padWorld = padPx / view.scale;
  let drawn = 0;

  for (const label of labelList) {
    if (!label || typeof label.x !== "number" || typeof label.y !== "number") continue;
    if (!isLabelInViewport(label, viewport, padWorld)) continue;
    if (!shouldRenderLabel(label.placeType, view.scale)) continue;

    const style = getLabelStyle(label.placeType);
    const x = label.x;
    const y = -label.y;
    const screenX = x * view.scale + view.offsetX;
    const screenY = y * view.scale + view.offsetY;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = `${style.fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeText(label.name, screenX, screenY);

    ctx.fillStyle = style.color;
    ctx.fillText(label.name, screenX, screenY);

    ctx.restore();
    drawn++;
  }

  return drawn;
}

function drawPolygon(ctx, way, nodesById, style, view) {
  const points = getWayPointList(way, nodesById);
  if (points.length < 3) return false;

  let started = false;

  ctx.beginPath();

  for (const pt of points) {
    if (!started) {
      ctx.moveTo(pt.x, pt.y);
      started = true;
    } else {
      ctx.lineTo(pt.x, pt.y);
    }
  }

  ctx.globalAlpha = style.alpha;
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = 1 / view.scale;

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  return true;
}

function drawRoad(ctx, way, nodesById, view) {
  const points = getWayPointList(way, nodesById);
  if (points.length < 2) return false;

  const style = getHighwayStyle(way.highway || way?.tags?.highway);

  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = (style.width + 1.5) / view.scale;
  ctx.beginPath();

  let started = false;
  for (const pt of points) {
    if (!started) {
      ctx.moveTo(pt.x, pt.y);
      started = true;
    } else {
      ctx.lineTo(pt.x, pt.y);
    }
  }
  ctx.stroke();

  ctx.globalAlpha = style.alpha;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width / view.scale;
  ctx.beginPath();

  started = false;
  for (const pt of points) {
    if (!started) {
      ctx.moveTo(pt.x, pt.y);
      started = true;
    } else {
      ctx.lineTo(pt.x, pt.y);
    }
  }
  ctx.stroke();

  return true;
}

function drawSelectedNodeOverlay(ctx, canvas, selectedNode) {
  const pad = 12;
  const panelW = 280;
  const panelH = 120;
  const x = canvas.width - panelW - pad;
  const y = 60;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(x, y, panelW, panelH);

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, panelW, panelH);

  ctx.fillStyle = "#222";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Node: ${selectedNode.id}`, x + 12, y + 28);
  ctx.fillText(`Lon: ${selectedNode.lon}`, x + 12, y + 52);
  ctx.fillText(`Lat: ${selectedNode.lat}`, x + 12, y + 76);

  ctx.fillStyle = "#666";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("Click empty space to clear", x + 12, y + 102);
}

function drawSelectedPoiOverlay(ctx, canvas, selectedPOI, selectedNode) {
  if (!selectedPOI) return;

  const pad = 12;
  const panelW = 280;
  const panelH = 95;
  const x = canvas.width - panelW - pad;
  const y = selectedNode ? 190 : 60;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(x, y, panelW, panelH);

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, panelW, panelH);

  const type = getPoiType(selectedPOI);

  ctx.fillStyle = "#222";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillText(selectedPOI.name || "Selected location", x + 12, y + 28);

  ctx.fillStyle = "#555";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(`Type: ${type}`, x + 12, y + 52);

  if (selectedPOI.id) {
    ctx.fillText(`ID: ${selectedPOI.id}`, x + 12, y + 74);
  }
}

export function renderMap(
  result,
  view = { scale: 1, offsetX: 0, offsetY: 0 },
  ui = {},
  debugFlags = {}
) {
  const {
    selectedNode = null,
    selectedPOI = null,
    poiFilters = {
      showCafes: true,
      showMonuments: true,
    },
    showNodes = false,
  } = ui;

  const canvas = document.getElementById("mapCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bounds = computeProjectedBounds(result);
  if (!bounds) return;

  const ways = result?.waysList || [];
  const areaList = result?.areaList || [];
  const nodesById = result?.nodesById;
  const poiList = result?.poiList || [];
  const labelList = result?.labelList || [];

  const polygonWays =
    areaList.length > 0
      ? areaList.filter((way) => hasDrawablePolygonGeometry(way, nodesById))
      : ways.filter(
          (way) =>
            getPolygonStyle(way.tags) &&
            hasDrawablePolygonGeometry(way, nodesById)
        );

  const highwayWays = ways.filter(
    (way) =>
      (way.highway || way?.tags?.highway) &&
      hasDrawableWayGeometry(way, nodesById)
  );

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ebe7dc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  const viewport = getVisibleWorldBounds(canvas, view);
  const padPx = 30;
  const padWorld = padPx / view.scale;

  const paddedViewport = {
    minX: viewport.minX - padWorld,
    maxX: viewport.maxX + padWorld,
    minY: viewport.minY - padWorld,
    maxY: viewport.maxY + padWorld,
  };

  const enableCulling = !debugFlags.disableCulling;
  const debugCulling = false;

  let considered = 0;
  let roadDrawn = 0;
  let culled = 0;

  ctx.save();
  ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);

  for (const way of polygonWays) {
    if (!way.bounds) {
      way.bounds = computeWayBounds(way, nodesById);
    }

    if (!way.bounds) continue;
    if (enableCulling && !intersectsAABB(way.bounds, paddedViewport)) continue;

    const style = getPolygonStyle(way.tags, way.areaType);
    if (!style) continue;

    drawPolygon(ctx, way, nodesById, style, view);
  }

  ctx.globalAlpha = 1;

  for (const way of highwayWays) {
    considered++;

    if (!way.bounds) {
      way.bounds = computeWayBounds(way, nodesById);
    }

    if (!way.bounds) {
      culled++;
      continue;
    }

    if (enableCulling && !intersectsAABB(way.bounds, paddedViewport)) {
      culled++;
      continue;
    }

    const didDraw = drawRoad(ctx, way, nodesById, view);

    if (didDraw) {
      roadDrawn++;
    } else {
      culled++;
    }
  }


  
  if (showNodes) {
    const nodesToDraw = (result?.nodeList || []).slice(0, 300);
    ctx.fillStyle = "#1a73e8";

    for (const node of nodesToDraw) {
      const x = node.x;
      const y = -node.y;
      const size = 2 / view.scale;
      ctx.fillRect(x, y, size, size);
    }
  }

  const poiDrawn = renderPois(ctx, poiList, view, viewport, poiFilters, selectedPOI);
  const labelsDrawn = renderLabels(ctx, labelList, view, viewport);

  if (selectedNode) {
    const x = selectedNode.x;
    const y = -selectedNode.y;
    const radius = 6 / view.scale;



    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.lineWidth = 2 / view.scale;
    ctx.strokeStyle = "#111";
    ctx.stroke();
  }



  ctx.restore();


  if (selectedNode) {
    drawSelectedNodeOverlay(ctx, canvas, selectedNode);
  }

  if (selectedPOI) {
    drawSelectedPoiOverlay(ctx, canvas, selectedPOI, selectedNode);
  }

  if (debugCulling) {
    ctx.fillStyle = "#222";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(`Ways considered: ${considered}`, 20, 255);
    ctx.fillText(`Ways drawn (frame): ${roadDrawn}`, 20, 272);
    ctx.fillText(`Ways culled (frame): ${culled}`, 20, 289);
    ctx.fillText(`POIs drawn: ${poiDrawn}`, 20, 306);
    ctx.fillText(`Labels drawn: ${labelsDrawn}`, 20, 323);
    ctx.fillText(`Culling: ${enableCulling ? "ON" : "OFF"}`, 20, 340);
  }

}