export const $ = (id) => document.getElementById(id);

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

export function renderMath(value = "") {
  return escapeHtml(value)
    .replace(/(\d+)\s*\/\s*(\d+)/g, '<span class="frac"><span class="top">$1</span><span class="bottom">$2</span></span>')
    .replace(/\n/g, "<br>");
}

export function objectValues(obj) {
  if (!obj) return [];
  return Array.isArray(obj) ? obj : Object.values(obj);
}

export function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

export function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.remove("hidden");
  window.setTimeout(() => el.classList.add("hidden"), 2400);
}

export function makeId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
