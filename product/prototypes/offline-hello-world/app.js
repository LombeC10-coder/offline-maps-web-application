// app.js – runs in the page (not in the Service Worker)

// Grab the status element from the HTML ( <p id="sw-status"> )
const statusEl = document.getElementById('sw-status');

function setStatus(message, isError = false) {
  if (!statusEl) return; // fail silently if element is missing
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

// Immediately-invoked async function to register the Service Worker
(async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });

      // Console logging (what you already had)
      if (reg.installing)  console.log('Service Worker installing');
      if (reg.waiting)     console.log('Service Worker installed (waiting)');
      if (reg.active)      console.log('Service Worker active');

      // User-facing status message
      setStatus('Service Worker registered ✅');
    } catch (err) {
      console.error('SW registration failed:', err);
      setStatus('Service Worker registration failed ❌', true);
    }
  } else {
    console.warn('Service Workers not supported in this browser.');
    setStatus('Service Workers are not supported in this browser ❌', true);
  }
})();


