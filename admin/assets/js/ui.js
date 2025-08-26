// /admin/assets/js/ui.js
export function $(sel, root=document){ return root.querySelector(sel); }
export function $all(sel, root=document){ return [...root.querySelectorAll(sel)]; }

export function kpiCard(id, title, value, note=''){
  return `
  <div class="kpi-card" id="${id}">
    <div class="kpi-title">${title}</div>
    <div class="kpi-value">${value}</div>
    ${note ? `<div class="kpi-note">${note}</div>` : ''}
  </div>`;
}
