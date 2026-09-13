import { subscribe, getState } from "../../state/store.js";

export function openModal({ title, bodyHtml, wide = false, onMount, onClose }) {
  const root = document.getElementById("modal-root");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal${wide ? " modal-wide" : ""}" role="dialog" aria-modal="true" aria-label="${title || ""}">
      <div class="modal-header"><h2>${title || ""}</h2><button class="modal-close" aria-label="Close">✕</button></div>
      <div class="modal-body">${bodyHtml || ""}</div>
    </div>
  `;
  root.appendChild(backdrop);
  function close() {
    backdrop.remove();
    onClose?.();
  }
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector(".modal-close").addEventListener("click", close);
  const escHandler = (e) => { if (e.key === "Escape") close(); };
  window.addEventListener("keydown", escHandler);
  const origClose = close;
  const wrappedClose = () => { window.removeEventListener("keydown", escHandler); origClose(); };
  onMount?.(backdrop.querySelector(".modal-body"), wrappedClose, backdrop.querySelector(".modal"));
  return wrappedClose;
}

export function confirmDialog({ title = "Are you sure?", message, confirmLabel = "Confirm", danger = true, onConfirm }) {
  openModal({
    title,
    bodyHtml: `<p>${message}</p>`,
    onMount: (body, close) => {
      const footer = document.createElement("div");
      footer.className = "modal-footer";
      footer.innerHTML = `<button class="btn" data-a="cancel">Cancel</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-a="ok">${confirmLabel}</button>`;
      body.parentElement.appendChild(footer);
      footer.querySelector('[data-a="cancel"]').addEventListener("click", close);
      footer.querySelector('[data-a="ok"]').addEventListener("click", () => { onConfirm(); close(); });
    },
  });
}

export function emptyState({ icon = "🏈", title, message, actionLabel, onAction }) {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.innerHTML = `
    <div class="empty-icon">${icon}</div>
    <h3>${title}</h3>
    <p>${message}</p>
    ${actionLabel ? `<button class="btn btn-primary" data-a="go">${actionLabel}</button>` : ""}
  `;
  if (actionLabel) div.querySelector('[data-a="go"]').addEventListener("click", onAction);
  return div;
}

export function mountToasts() {
  const root = document.getElementById("toast-root");
  function render() {
    const { ui } = getState();
    root.innerHTML = ui.toasts.map((t) => `<div class="toast toast-${t.kind === "danger" || t.kind === "success" ? t.kind : ""}">${t.message}</div>`).join("");
  }
  subscribe(render);
  render();
}
