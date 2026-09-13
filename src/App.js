import { subscribe, getState, getActivePlaybook, navigate, toggleSidebar, setTheme } from "./state/store.js";
import { mountToasts } from "./components/common/common.js";

const NAV = [
  { group: "", items: [{ id: "dashboard", label: "Dashboard", icon: "🏠" }] },
  {
    group: "Design",
    items: [
      { id: "designer", label: "Play Designer", icon: "✏️" },
      { id: "formations", label: "Formations", icon: "📐" },
    ],
  },
  {
    group: "Organize",
    items: [
      { id: "library", label: "Play Library", icon: "🗂️" },
      { id: "playbook", label: "Playbook Builder", icon: "📖" },
      { id: "installation", label: "Installation Plan", icon: "🗓️" },
    ],
  },
  { group: "", items: [{ id: "settings", label: "Settings", icon: "⚙️" }] },
];

const VIEW_TITLES = {
  dashboard: "Dashboard",
  designer: "Play Designer",
  formations: "Formations",
  library: "Play Library",
  playbook: "Playbook Builder",
  installation: "Installation Plan",
  settings: "Settings",
};

let viewModules = null;
async function loadViewModules() {
  if (viewModules) return viewModules;
  const [dashboard, library, playbook, settings, formations, installation, designer] = await Promise.all([
    import("./components/dashboard/Dashboard.js"),
    import("./components/library/PlayLibrary.js"),
    import("./components/playbook/PlaybookBuilder.js"),
    import("./components/settings/Settings.js"),
    import("./components/formations/FormationsGallery.js"),
    import("./components/playbook/InstallationPlan.js"),
    import("./components/designer/DesignerView.js"),
  ]);
  viewModules = { dashboard, library, playbook, settings, formations, installation, designer };
  return viewModules;
}

export async function mountApp(root) {
  mountToasts();
  await loadViewModules();

  root.innerHTML = `
    <div class="app-shell">
      <button class="btn btn-icon mobile-menu-btn" data-el="menubtn" style="position:fixed;top:10px;left:10px;z-index:160;">☰</button>
      <div data-el="backdrop"></div>
      <nav class="sidebar" data-el="sidebar"></nav>
      <div class="main-area">
        <div class="topbar" data-el="topbar"></div>
        <div class="view-body" data-el="viewbody"></div>
      </div>
    </div>
  `;
  const els = {
    sidebar: root.querySelector('[data-el="sidebar"]'),
    topbar: root.querySelector('[data-el="topbar"]'),
    viewbody: root.querySelector('[data-el="viewbody"]'),
    menubtn: root.querySelector('[data-el="menubtn"]'),
    backdrop: root.querySelector('[data-el="backdrop"]'),
  };
  els.menubtn.addEventListener("click", () => toggleSidebar());
  els.backdrop.addEventListener("click", () => toggleSidebar(false));

  let currentKey = null;
  let destroyCurrent = null;

  function renderSidebar() {
    const state = getState();
    els.sidebar.className = "sidebar" + (state.ui.sidebarOpen ? " open" : "");
    els.backdrop.className = state.ui.sidebarOpen ? "sidebar-backdrop" : "";
    const pb = getActivePlaybook();
    els.sidebar.innerHTML = `
      <div class="sidebar-brand">
        <div class="logo-mark">🏈</div>
        <div class="brand-text"><strong>${escapeHtml(pb?.team || "Gridiron")}</strong><span>${escapeHtml(pb?.name || "Playbook Designer")}</span></div>
      </div>
      ${NAV.map(
        (group) => `
        ${group.group ? `<div class="nav-group"><div class="nav-group-label">${group.group}</div>` : `<div class="nav-group" style="margin-top:2px;">`}
        ${group.items
          .map(
            (item) => `<div class="nav-item${state.view.name === item.id ? " active" : ""}" data-nav="${item.id}" tabindex="0" role="button">
              <span class="nav-icon">${item.icon}</span>${item.label}
            </div>`
          )
          .join("")}
        </div>`
      ).join("")}
      <div class="sidebar-footer">
        <div class="nav-item" data-action="toggle-theme" tabindex="0" role="button">
          <span class="nav-icon">${state.ui.theme === "dark" ? "☀️" : "🌙"}</span>${state.ui.theme === "dark" ? "Light Mode" : "Dark Mode"}
        </div>
      </div>
    `;
    els.sidebar.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => navigate(el.dataset.nav));
    });
    els.sidebar.querySelector('[data-action="toggle-theme"]').addEventListener("click", () => {
      setTheme(getState().ui.theme === "dark" ? "light" : "dark");
    });
  }

  function renderTopbar() {
    const state = getState();
    const pb = getActivePlaybook();
    let crumb = VIEW_TITLES[state.view.name] || "";
    if (state.view.name === "designer" && state.view.params.playId) {
      const play = pb?.plays.find((p) => p.id === state.view.params.playId);
      crumb = `Play Designer <b>›</b> ${escapeHtml(play?.name || "Untitled")}`;
    }
    els.topbar.innerHTML = `<div class="crumb">${escapeHtml(pb?.name || "")} <b>›</b> <b>${crumb}</b></div>`;
  }

  async function ensureView() {
    const state = getState();
    const key = state.view.name + ":" + (state.view.params.playId || "");
    if (key === currentKey) return;
    currentKey = key;
    if (destroyCurrent) { try { destroyCurrent(); } catch {} destroyCurrent = null; }
    els.viewbody.innerHTML = "";
    els.viewbody.classList.remove("no-pad", "no-scroll");
    const mod = viewModules[state.view.name];
    if (!mod) {
      els.viewbody.innerHTML = `<div class="empty-state"><h3>Unknown view</h3></div>`;
      return;
    }
    if (state.view.name === "designer") {
      els.viewbody.classList.add("no-pad", "no-scroll");
    }
    const result = await mod.mount(els.viewbody, state.view.params);
    if (typeof result === "function") destroyCurrent = result;
  }

  subscribe(() => {
    renderSidebar();
    renderTopbar();
    ensureView();
  });
  renderSidebar();
  renderTopbar();
  ensureView();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
