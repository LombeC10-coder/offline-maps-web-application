export function setupFileLoader({ onFileSelected }) {
  const input = document.getElementById("fileInput");
  const status = document.getElementById("loadStatus");

  if (!input) throw new Error("fileInput not found in DOM");

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    status.textContent = `Loading: ${file.name} …`;

    try {
      await onFileSelected(file);
    } catch (err) {
      console.error(err);
      status.textContent = `Failed to load file: ${err.message}`;
    }
  });
}

export function setLoadStatus(text) {
  const status = document.getElementById("loadStatus");
  if (status) status.textContent = text;
}

export function setSummary(html) {
  const el = document.getElementById("summary");
  if (el) el.innerHTML = html;
}
