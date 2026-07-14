const fileInput = document.getElementById("fileInput");
const fileNameSpan = document.getElementById("fileName");
const statusEl = document.getElementById("status");
const nodesCountEl = document.getElementById("nodesCount");
const waysCountEl = document.getElementById("waysCount");
const relsCountEl = document.getElementById("relsCount");
const tagKeysCountEl = document.getElementById("tagKeysCount");
const previewBody = document.getElementById("previewBody");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = "status" + (isError ? " error" : "");
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"]/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

function detectFormat(text) {
  const t = text.trimStart();
  if (t.startsWith("<")) return "xml";
  if (t.startsWith("{") || t.startsWith("[")) return "json";
  return "unknown";
}

function parseXmlOSM(text, previewLimit = 20) {
  const dom = new DOMParser().parseFromString(text, "application/xml");
  const parserError = dom.querySelector("parsererror");
  if (parserError) {
    throw new Error("Invalid XML (parser error)");
  }

  const nodes = Array.from(dom.getElementsByTagName("node"));
  const ways = Array.from(dom.getElementsByTagName("way"));
  const rels = Array.from(dom.getElementsByTagName("relation"));

  const tagKeySet = new Set();
  const preview = [];

  function makePreview(el, type) {
    const id = el.getAttribute("id") || "";
    const tags = Array.from(el.getElementsByTagName("tag")).map((t) => {
      const k = t.getAttribute("k");
      const v = t.getAttribute("v");
      if (k) tagKeySet.add(k);
      return [k, v];
    });

    const interesting = ["name", "highway", "building", "amenity"];
    const parts = [];

    for (const [k, v] of tags) {
      if (!k || !v) continue;
      if (interesting.includes(k)) {
        parts.push(`${k}=${v}`);
      }
    }

    if (parts.length === 0) {
      for (const [k, v] of tags.slice(0, 2)) {
        if (k && v) parts.push(`${k}=${v}`);
      }
    }

    return {
      type,
      id,
      text: parts.join(", ") || "(no tags)",
    };
  }

  for (const n of nodes.slice(0, previewLimit)) {
    preview.push(makePreview(n, "node"));
  }
  for (const w of ways.slice(0, previewLimit - preview.length)) {
    preview.push(makePreview(w, "way"));
  }
  for (const r of rels.slice(0, previewLimit - preview.length)) {
    preview.push(makePreview(r, "relation"));
  }

  return {
    counts: {
      nodes: nodes.length,
      ways: ways.length,
      relations: rels.length,
    },
    uniqueTagKeys: Array.from(tagKeySet),
    preview,
  };
}

function parseOverpassJSON(text, previewLimit = 20) {
  const data = JSON.parse(text);
  const elements = Array.isArray(data.elements)
    ? data.elements
    : Array.isArray(data)
    ? data
    : [];

  const counts = { nodes: 0, ways: 0, relations: 0 };
  const tagKeySet = new Set();
  const preview = [];

  for (const el of elements) {
    if (el.type === "node") counts.nodes++;
    else if (el.type === "way") counts.ways++;
    else if (el.type === "relation") counts.relations++;

    if (preview.length < previewLimit) {
      const tags = el.tags || {};
      Object.keys(tags).forEach((k) => tagKeySet.add(k));

      const interesting = ["name", "highway", "building", "amenity"];
      const parts = [];

      for (const key of interesting) {
        if (tags[key]) parts.push(`${key}=${tags[key]}`);
      }

      if (parts.length === 0) {
        Object.entries(tags)
          .slice(0, 2)
          .forEach(([k, v]) => parts.push(`${k}=${v}`));
      }

      preview.push({
        type: el.type || "?",
        id: el.id ?? "",
        text: parts.join(", ") || "(no tags)",
      });
    }
  }

  return {
    counts,
    uniqueTagKeys: Array.from(tagKeySet),
    preview,
  };
}

function renderSummary(summary) {
  nodesCountEl.textContent = summary.counts.nodes.toLocaleString();
  waysCountEl.textContent = summary.counts.ways.toLocaleString();
  relsCountEl.textContent = summary.counts.relations.toLocaleString();
  tagKeysCountEl.textContent =
    summary.uniqueTagKeys.length.toLocaleString();

  previewBody.innerHTML = "";
  summary.preview.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(row.type)}</td>
      <td>${escapeHtml(row.id)}</td>
      <td>${escapeHtml(row.text)}</td>
    `;
    previewBody.appendChild(tr);
  });
}

async function handleFile(file) {
  if (!file) return;
  fileNameSpan.textContent = file.name;
  setStatus("Reading file…");
  try {
    const text = await file.text();
    const fmt = detectFormat(text);

    let summary;
    if (fmt === "xml") {
      summary = parseXmlOSM(text);
      setStatus("Parsed OSM XML successfully.");
    } else if (fmt === "json") {
      summary = parseOverpassJSON(text);
      setStatus("Parsed Overpass JSON successfully.");
    } else {
      throw new Error("Unknown format. Use .osm (XML) or Overpass JSON.");
    }

    renderSummary(summary);
  } catch (err) {
    console.error(err);
    setStatus("Error: " + err.message, true);
    nodesCountEl.textContent = "0";
    waysCountEl.textContent = "0";
    relsCountEl.textContent = "0";
    tagKeysCountEl.textContent = "0";
    previewBody.innerHTML = "";
  }
}

fileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  handleFile(file);
});
