/* =========================
   Canvas + Toolbar setup
   ========================= */
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

let shape = "rect";
let mode = "draw"; // 'draw' or 'pan'

// Buttons
const rectBtn = document.getElementById("rectBtn");
const circleBtn = document.getElementById("circleBtn");
const panBtn = document.getElementById("panBtn");
const clearBtn = document.getElementById("clearBtn");
const themeToggleBtn = document.getElementById("themeToggle");

// Displays
const modeDisplay = document.getElementById("modeDisplay");
const coordsDisplay = document.getElementById("coordsDisplay");

/* --- Update mode indicator --- */
function updateModeDisplay() {
  if (mode === "pan") {
    modeDisplay.textContent = "Mode: Pan (drag to move view)";
  } else {
    const shapeName = shape === "rect" ? "Rectangle" : "Circle";
    modeDisplay.textContent = `Mode: Draw (${shapeName})`;
  }
}
updateModeDisplay();

/* --- Button handlers --- */
rectBtn.onclick = () => {
  shape = "rect";
  mode = "draw";
  updateModeDisplay();
};

circleBtn.onclick = () => {
  shape = "circle";
  mode = "draw";
  updateModeDisplay();
};

panBtn.onclick = () => {
  mode = "pan";
  updateModeDisplay();
};

/* --- Light / Dark theme toggle --- */
if (themeToggleBtn) {
  themeToggleBtn.onclick = () => {
    const dark = document.body.classList.toggle("dark");
    themeToggleBtn.textContent = dark ? "Light mode" : "Dark mode";
  };
}

/* =========================
   Drawing + Panning State
   ========================= */
let drawing = false;
let isPanning = false;

let startX, startY;     // world coords for drawing
let lastMouseX, lastMouseY;

let panX = 0;           // camera offset
let panY = 0;

let shapes = [];
let db = null;
let ready = false;

/* =========================
   IndexedDB Helpers
   ========================= */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("canvasDB", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("shapes")) {
        db.createObjectStore("shapes", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function addShapeDB(shapeObj) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("shapes", "readwrite");
    const store = tx.objectStore("shapes");
    const req = store.add(shapeObj);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllShapesDB() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("shapes", "readonly");
    const store = tx.objectStore("shapes");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function clearAllShapesDB() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("shapes", "readwrite");
    const store = tx.objectStore("shapes");
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* =========================
   Initialise
   ========================= */
(async function init() {
  try {
    db = await openDB();
    shapes = await getAllShapesDB();
    redrawShapes();
  } catch (err) {
    console.error("DB init failed:", err);
    shapes = [];
    redrawShapes();
  } finally {
    ready = true;
  }
})();

/* =========================
   Clear Button
   ========================= */
clearBtn.onclick = async () => {
  try {
    if (db) await clearAllShapesDB();
  } catch (err) {
    console.warn("Could not clear DB:", err);
  }
  shapes = [];
  redrawShapes();
};

/* =========================
   Mouse Events
   ========================= */
canvas.addEventListener("mousedown", (e) => {
  if (!ready) return;

  lastMouseX = e.offsetX;
  lastMouseY = e.offsetY;

  if (mode === "pan") {
    isPanning = true;
    return;
  }

  drawing = true;
  startX = e.offsetX - panX;
  startY = e.offsetY - panY;
});

canvas.addEventListener("mousemove", (e) => {
  if (!ready) return;

  // Update world cursor display
  const worldX = e.offsetX - panX;
  const worldY = e.offsetY - panY;
  coordsDisplay.textContent = `Cursor: (${worldX.toFixed(0)}, ${worldY.toFixed(0)})`;

  // Panning
  if (isPanning) {
    const dx = e.offsetX - lastMouseX;
    const dy = e.offsetY - lastMouseY;

    panX += dx;
    panY += dy;

    lastMouseX = e.offsetX;
    lastMouseY = e.offsetY;

    redrawShapes();
    return;
  }

  // Drawing preview
  if (drawing) {
    redrawShapes();
    const currentX = e.offsetX - panX;
    const currentY = e.offsetY - panY;

    ctx.save();
    ctx.translate(panX, panY);
    drawShape(shape, startX, startY, currentX, currentY, "green");
    ctx.restore();
  }
});

canvas.addEventListener("mouseup", async (e) => {
  if (isPanning) {
    isPanning = false;
    return;
  }

  if (!drawing) return;
  drawing = false;

  const endX = e.offsetX - panX;
  const endY = e.offsetY - panY;

  const newShape = {
    type: shape,
    x1: startX,
    y1: startY,
    x2: endX,
    y2: endY,
    color: "green"
  };

  try {
    if (db) {
      await addShapeDB(newShape);
      shapes = await getAllShapesDB();
    } else {
      shapes.push(newShape);
    }
  } catch (err) {
    shapes.push(newShape);
  }

  redrawShapes();
});

/* =========================
   Drawing Helpers
   ========================= */
function drawShape(type, x1, y1, x2, y2, color = "green") {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  if (type === "rect") {
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
  } else if (type === "circle") {
    const radius = Math.hypot(x2 - x1, y2 - y1);
    ctx.arc(x1, y1, radius, 0, Math.PI * 2);
  }

  ctx.stroke();
}

function redrawShapes() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(panX, panY);

  drawGrid(ctx);

  for (const s of shapes) {
    drawShape(s.type, s.x1, s.y1, s.x2, s.y2, s.color || "green");
  }

  ctx.restore();
}

function drawGrid(ctx, spacing = 20) {
  ctx.strokeStyle = "#eee";
  for (let x = 0; x < ctx.canvas.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ctx.canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < ctx.canvas.height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ctx.canvas.width, y);
    ctx.stroke();
  }
}
