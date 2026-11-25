import { esc } from '../lib/utils.js';
import { icon } from './icons.js';

/**
 * Photo gallery / slideshow markup.
 * Slides are pre-rendered so the first photo paints immediately; the rest are
 * lazy-loaded and only the active slide is visible.
 */
export function photoGallery(images, { className = '' } = {}) {
  if (!images.length) return '';
  const multiple = images.length > 1;

  return `
    <div class="gallery${className ? ` ${className}` : ''}" data-gallery>
      <div class="gallery-stage">
        ${images
          .map(
            (image, index) => `
          <figure class="gallery-slide${index === 0 ? ' is-active' : ''}">
            <img src="${esc(image.src)}" alt="${esc(image.alt)}" width="900" height="600"
              loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async" />
          </figure>`,
          )
          .join('')}
        ${
          multiple
            ? `<button type="button" class="gallery-arrow is-prev" data-gallery-prev aria-label="Foto sebelumnya">${icon(
                'arrowLeft',
                18,
              )}</button>
               <button type="button" class="gallery-arrow is-next" data-gallery-next aria-label="Foto berikutnya">${icon(
                 'arrowRight',
                 18,
               )}</button>`
            : ''
        }
      </div>
      ${
        multiple
          ? `<div class="gallery-bar">
              <div class="gallery-dots">
                ${images
                  .map(
                    (image, index) =>
                      `<button type="button" class="gallery-dot${
                        index === 0 ? ' is-active' : ''
                      }" data-gallery-dot="${index}" aria-label="Foto ${index + 1}: ${esc(
                        image.alt,
                      )}"></button>`,
                  )
                  .join('')}
              </div>
              <span class="gallery-count" data-gallery-count>1 / ${images.length}</span>
            </div>`
          : ''
      }
    </div>
  `;
}

let bound = false;

/** Binds one delegated listener for every gallery on the page. */
export function initGalleries() {
  if (bound) return;
  bound = true;

  document.addEventListener('click', (event) => {
    const root = event.target.closest('[data-gallery]');
    if (!root) return;
    const slides = Array.from(root.querySelectorAll('.gallery-slide'));
    if (slides.length < 2) return;

    const current = Math.max(
      0,
      slides.findIndex((slide) => slide.classList.contains('is-active')),
    );
    const nextBtn = event.target.closest('[data-gallery-next]');
    const prevBtn = event.target.closest('[data-gallery-prev]');
    const dot = event.target.closest('[data-gallery-dot]');

    let index = current;
    if (nextBtn) index = current + 1;
    else if (prevBtn) index = current - 1;
    else if (dot) index = Number(dot.dataset.galleryDot);
    else return;

    show(root, slides, (index + slides.length) % slides.length);
  });
}

function show(root, slides, index) {
  slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
  root.querySelectorAll('[data-gallery-dot]').forEach((dot, i) => {
    dot.classList.toggle('is-active', i === index);
    dot.setAttribute('aria-current', String(i === index));
  });
  const counter = root.querySelector('[data-gallery-count]');
  if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
}
