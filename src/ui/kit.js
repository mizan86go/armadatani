import { bookingStatusMeta, unitStatusMeta } from '../lib/domain.js';
import { esc } from '../lib/utils.js';
import { icon } from './icons.js';

export function badge(text, tone = 'neutral', plain = false) {
  return `<span class="badge badge-${tone}${plain ? ' badge-plain' : ''}">${esc(text)}</span>`;
}

export function unitStatusBadge(status) {
  const meta = unitStatusMeta(status);
  return badge(meta.label, meta.tone);
}

export function bookingStatusBadge(status) {
  const meta = bookingStatusMeta(status);
  return badge(meta.label, meta.tone);
}

export function statCard({ label, value, hint = '', iconName = 'chart', accent = false }) {
  return `
    <article class="stat-card${accent ? ' is-accent' : ''}">
      <div class="stat-label">
        <span>${esc(label)}</span>
        <span class="stat-icon">${icon(iconName, 15)}</span>
      </div>
      <div class="stat-value">${value}</div>
      ${hint ? `<div class="stat-hint">${esc(hint)}</div>` : ''}
    </article>
  `;
}

export function alertBox(tone, message, { dismissible = false } = {}) {
  return `<div class="alert alert-${tone}" role="alert">
    ${icon(tone === 'error' ? 'alert' : tone === 'success' ? 'check' : 'shield', 16)}
    <div>${message}</div>
    ${dismissible ? '<button type="button" class="btn btn-ghost btn-sm" data-dismiss-alert aria-label="Tutup">✕</button>' : ''}
  </div>`;
}

export function emptyState({ title, description = '', actionLabel = '', actionAttr = '', iconName = 'grid' }) {
  return `<div class="empty">
    <div class="empty-icon">${icon(iconName, 20)}</div>
    <h3>${esc(title)}</h3>
    ${description ? `<p>${esc(description)}</p>` : ''}
    ${actionLabel ? `<button type="button" class="btn btn-primary btn-sm" ${actionAttr}>${esc(actionLabel)}</button>` : ''}
  </div>`;
}

export function progressBar(percent) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const tone = pct >= 100 ? 'is-danger' : pct >= 85 ? 'is-warn' : '';
  return `<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
    <div class="progress-bar ${tone}" style="width:${pct}%"></div>
  </div>`;
}

export function quoteBox(quote, unit, operatorWage) {
  return `
    <div class="quote-box">
      <div class="kv-row"><dt>Tarif dasar × ${quote.quantity} ${esc(
        unit?.scheme === 'per_ha' ? 'ha' : unit?.scheme === 'per_hour' ? 'jam' : 'ritase',
      )} × ${quote.days} hari</dt><dd>${rupiahText(quote.base)}</dd></div>
      ${
        quote.mode === 'full'
          ? `<div class="kv-row"><dt>BBM (± ${quote.liters} L)</dt><dd>${rupiahText(quote.fuelCost)}</dd></div>
             ${
               operatorWage
                 ? `<div class="kv-row"><dt>Upah operator × ${quote.days} hari</dt><dd>${rupiahText(quote.wage)}</dd></div>`
                 : ''
             }`
          : `<div class="kv-row"><dt>Skema</dt><dd>Lepas kunci (alat saja)</dd></div>`
      }
      <div class="total"><span>Estimasi total</span><span>${rupiahText(quote.total)}</span></div>
    </div>
  `;
}

function rupiahText(value) {
  return `Rp ${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;
}

export function tabs(items, activeValue, dataAttr = 'data-tab') {
  return `<div class="tabs" role="tablist">
    ${items
      .map(
        (item) =>
          `<button type="button" class="tab${
            item.value === activeValue ? ' is-active' : ''
          }" role="tab" aria-selected="${item.value === activeValue}" ${dataAttr}="${esc(item.value)}">${esc(
            item.label,
          )}${item.count != null ? ` · ${item.count}` : ''}</button>`,
      )
      .join('')}
  </div>`;
}
