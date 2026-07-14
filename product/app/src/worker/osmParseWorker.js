// src/workers/osmParseWorker.js

import { parseOSMFile } from "../map/osmParser.js";

self.onmessage = async (event) => {
  const { file } = event.data || {};

  if (!file) {
    self.postMessage({
      type: "error",
      message: "No file received by worker.",
    });
    return;
  }

  try {
    const start = performance.now();

    self.postMessage({
      type: "status",
      message: `Worker: parsing ${file.name}...`,
    });

    const result = await parseOSMFile(file);

    const parseMs = performance.now() - start;

    self.postMessage({
      type: "success",
      result,
      timings: {
        parseMs,
      },
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error?.message || "Worker parsing failed.",
    });
  }
};