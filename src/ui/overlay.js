import { esc } from '../lib/utils.js';
import { icon } from './icons.js';

let lastFocused = null;
let escapeHandler = null;

export function mountOverlays() {
  if (!document.getElementById('modal-root')) {
    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  }
  if (!document.getElementById('toast-root')) {
    const toastRoot = document.createElement('div');
    toastRoot.id = 'toast-root';
    toastRoot.className = 'toast-stack';
    toastRoot.setAttribute('role', 'status');
    toastRoot.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastRoot);
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-modal-close]');
    if (target) closeModal();
  });
}

export function openModal({
  title,
  subtitle = '',
  body = '',
  footer = null,
  submitLabel = 'Simpan',
  cancelLabel = 'Batal',
  wide = false,
  onSubmit = null,
  onMount = null,
}) {
  closeModal();
  lastFocused = document.activeElement;
  const root = document.getElementById('modal-root');

  const footMarkup =
    footer !== null
      ? footer
      : `<button type="button" class="btn btn-outline" data-modal-close>${esc(cancelLabel)}</button>
         ${onSubmit ? `<button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>` : ''}`;

  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal${wide ? ' is-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head">
          <div>
            <h2 id="modal-title">${esc(title)}</h2>
            ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
          </div>
          <button type="button" class="icon-btn" data-modal-close aria-label="Tutup">${icon('x', 16)}</button>
        </div>
        <form class="modal-form" id="modal-form" novalidate>
          <div class="modal-body">${body}</div>
          <div class="modal-foot">${footMarkup}</div>
        </form>
      </div>
    </div>
  `;

  const backdrop = root.querySelector('[data-modal-backdrop]');
  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) closeModal();
  });

  const form = root.querySelector('#modal-form');
  if (onSubmit) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const result = await onSubmit(form, event);
        if (result !== false) closeModal();
      } catch (error) {
        const box = form.querySelector('[data-modal-error]');
        if (box) {
          box.innerHTML = `<div class="alert alert-error" role="alert">${esc(error.message)}</div>`;
        } else {
          toast(error.message, 'error');
        }
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  escapeHandler = (event) => {
    if (event.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', escapeHandler);

  onMount?.(root, form);
  const firstField = form.querySelector('input:not([type="hidden"]), select, textarea');
  if (firstField) firstField.focus({ preventScroll: true });
  return root;
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = '';
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
  if (lastFocused?.focus) lastFocused.focus({ preventScroll: true });
  lastFocused = null;
}

export function toast(message, tone = 'success') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast is-${tone === 'error' ? 'error' : 'success'}`;
  el.innerHTML = `<span>${icon(tone === 'error' ? 'alert' : 'check', 16)}</span><span>${esc(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 180ms ease';
    setTimeout(() => el.remove(), 220);
  }, 3600);
}

export function confirmDialog({
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  tone = 'danger',
  onConfirm,
}) {
  return openModal({
    title,
    body: `<div data-modal-error></div><p style="font-size:0.88rem;color:var(--slate-600)">${esc(message)}</p>`,
    submitLabel: confirmLabel,
    cancelLabel: 'Batal',
    onSubmit: async () => {
      await onConfirm();
    },
    onMount: (root) => {
      const btn = root.querySelector('button[type="submit"]');
      if (btn && tone === 'danger') btn.className = 'btn btn-danger';
    },
  });
}
