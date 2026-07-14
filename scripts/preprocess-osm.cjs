const fs = require("fs");
const path = require("path");
const sax = require("sax");

// -----------------------------
// 1. Choose input and output
// -----------------------------
const inputPath = path.resolve(__dirname, "../data/lusaka.osm");
const outputPath = path.resolve(__dirname, "../product/data/lusaka-lite.json");

// -----------------------------
// 2. Data structures
// -----------------------------
const nodes = new Map();
const roads = [];
const pois = [];
const labels = [];

let currentNode = null;
let currentWay = null;

// -----------------------------
// 3. Helper functions
// -----------------------------
function isUsefulHighway(highway) {
  return [
    "motorway",
    "trunk",
    "primary",
    "secondary",
    "tertiary",
    "residential",
    "unclassified",
    "service",
    "footway",
    "path",
    "track",
  ].includes(highway);
}

function isUsefulPoi(tags) {
  return (
    tags.amenity === "cafe" ||
    tags.historic === "monument" ||
    tags.aeroway === "aerodrome"
  );
}

function isUsefulLabel(tags) {
  return (
    tags.place === "city" ||
    tags.place === "town" ||
    tags.place === "suburb" ||
    tags.place === "neighbourhood"
  );
}

function project(lat, lon) {
  const x = (lon * 20037508.34) / 180;
  let y =
    Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return { x, y };
}

// -----------------------------
// 4. Create SAX stream parser
// -----------------------------
const parser = sax.createStream(true, {});

// Opening tags
parser.on("opentag", (node) => {
  if (node.name === "node") {
    currentNode = {
      id: node.attributes.id,
      lat: parseFloat(node.attributes.lat),
      lon: parseFloat(node.attributes.lon),
      tags: {},
    };
  }

  if (node.name === "way") {
    currentWay = {
      id: node.attributes.id,
      nodeRefs: [],
      tags: {},
    };
  }

  if (node.name === "tag") {
    const k = node.attributes.k;
    const v = node.attributes.v;

    if (currentNode) {
      currentNode.tags[k] = v;
    }

    if (currentWay) {
      currentWay.tags[k] = v;
    }
  }

  if (node.name === "nd" && currentWay) {
    currentWay.nodeRefs.push(node.attributes.ref);
  }
});

// Closing tags
parser.on("closetag", (tagName) => {
  if (tagName === "node" && currentNode) {
    nodes.set(currentNode.id, {
      lat: currentNode.lat,
      lon: currentNode.lon,
    });

    if (isUsefulPoi(currentNode.tags)) {
      const { x, y } = project(currentNode.lat, currentNode.lon);

      pois.push({
        id: currentNode.id,
        x,
        y,
        name: currentNode.tags.name || "",
        category:
          currentNode.tags.amenity ||
          currentNode.tags.historic ||
          currentNode.tags.aeroway ||
          "poi",
      });
    }

    if (isUsefulLabel(currentNode.tags)) {
      const { x, y } = project(currentNode.lat, currentNode.lon);

      labels.push({
        id: currentNode.id,
        x,
        y,
        name: currentNode.tags.name || "",
        place: currentNode.tags.place || "",
      });
    }

    currentNode = null;
  }

  if (tagName === "way" && currentWay) {
    const highway = currentWay.tags.highway;

    if (highway && isUsefulHighway(highway)) {
      const points = [];

      for (const ref of currentWay.nodeRefs) {
        const coord = nodes.get(ref);
        if (!coord) continue;

        const projected = project(coord.lat, coord.lon);
        points.push(projected);
      }

      if (points.length >= 2) {
        roads.push({
          id: currentWay.id,
          highway,
          name: currentWay.tags.name || "",
          points,
        });
      }
    }

    currentWay = null;
  }
});

// End of file
parser.on("end", () => {
  const result = {
    roads,
    pois,
    labels,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log("Preprocessing complete.");
  console.log(`Roads: ${roads.length}`);
  console.log(`POIs: ${pois.length}`);
  console.log(`Labels: ${labels.length}`);
  console.log(`Saved to: ${outputPath}`);
});

// Error handling
parser.on("error", (err) => {
  console.error("Parsing error:", err.message);
  process.exit(1);
});

// -----------------------------
// 5. Start reading the file
// -----------------------------
console.log(`Reading: ${inputPath}`);
fs.createReadStream(inputPath, { encoding: "utf8" }).pipe(parser);