import { boot } from "./state/store.js";
import { mountApp } from "./App.js";

window.addEventListener("error", (e) => {
  console.error("Unhandled error:", e.error || e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
});

async function start() {
  try {
    await boot();
    await mountApp(document.getElementById("app"));
  } catch (err) {
    console.error(err);
    document.getElementById("app").innerHTML = `
      <div style="padding:40px;font-family:sans-serif;color:#eee;background:#111;height:100vh;">
        <h2>Gridiron Playbook failed to start</h2>
        <p>${(err && err.message) || err}</p>
        <p>Try reloading the page. If the problem persists, use Settings → Reset All Application Data (once the app loads) or clear this site's data in your browser settings.</p>
      </div>`;
  }
}

start();
