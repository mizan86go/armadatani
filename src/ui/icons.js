const PATHS = {
  home: '<path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 10v9h11v-9"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
  calendar:
    '<rect x="4" y="5.5" width="16" height="14" rx="2.2"/><path d="M8 3.5v4M16 3.5v4M4 10.2h16"/>',
  clipboard:
    '<rect x="5" y="4.5" width="14" height="16" rx="2.2"/><path d="M9.5 4.5V3.4h5v1.1"/><path d="M8.8 10.2h6.4M8.8 14h4.6"/>',
  truck:
    '<path d="M3 7.2h9.6v8.6H3z"/><path d="M12.6 10.2h4.1l3 3v2.6h-7.1z"/><circle cx="7" cy="18" r="1.8"/><circle cx="16.8" cy="18" r="1.8"/>',
  users:
    '<circle cx="9.2" cy="9" r="3.2"/><path d="M3.6 19c.6-3.1 2.8-4.8 5.6-4.8s5 1.7 5.6 4.8"/><path d="M16.2 6.4a3 3 0 0 1 0 5.3"/><path d="M17.6 14.8c1.7.7 2.7 2.2 3 4.2"/>',
  fuel: '<path d="M5 20V5.4A1.4 1.4 0 0 1 6.4 4h6A1.4 1.4 0 0 1 13.8 5.4V20"/><path d="M4 20h10.8"/><path d="M7.4 8.2h3.8"/><path d="M13.8 10h2.4A1.6 1.6 0 0 1 17.8 11.6V17a1.6 1.6 0 0 0 3.2 0V9.2l-2.4-2.4"/>',
  chart: '<path d="M4 20V4"/><path d="M4.2 20h15.6"/><path d="M8 16.2v-4.4M12.4 16.2V7.8M16.8 16.2v-6"/>',
  logout:
    '<path d="M10 4.8H6.6A1.6 1.6 0 0 0 5 6.4v11.2A1.6 1.6 0 0 0 6.6 19.2H10"/><path d="M14 8.2 17.8 12 14 15.8"/><path d="M9.2 12h8.4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.4 4.6 4.6L19 7.4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  star: '<path d="m12 4.2 2.35 4.78 5.27.77-3.81 3.72.9 5.23L12 16.23l-4.71 2.47.9-5.23L4.38 9.75l5.27-.77z"/>',
  search: '<circle cx="11" cy="11" r="6.2"/><path d="m15.6 15.6 4 4"/>',
  pin: '<path d="M12 20.8s5.8-5.3 5.8-9.6a5.8 5.8 0 1 0-11.6 0c0 4.3 5.8 9.6 5.8 9.6z"/><circle cx="12" cy="11" r="2.1"/>',
  clock: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.8v4.5l3 1.7"/>',
  alert: '<path d="M12 4.4 20.8 19.2H3.2z"/><path d="M12 9.4v4.2M12 16.6v.1"/>',
  shield:
    '<path d="M12 3.6 18.8 6v6.1c0 4.1-2.9 7.1-6.8 8.4-3.9-1.3-6.8-4.3-6.8-8.4V6z"/><path d="m9.2 11.9 2 2 3.8-3.8"/>',
  edit: '<path d="M4.6 19.4h3.9L19.2 8.7a2 2 0 0 0-2.8-2.8L5.7 16.6z"/><path d="m14.6 6.9 2.8 2.8"/>',
  trash:
    '<path d="M5 7.2h14"/><path d="M9.2 7.2V5.6h5.6v1.6"/><path d="m6.6 7.2.8 12.3h9.2l.8-12.3"/><path d="M10.4 10.6v5.6M13.6 10.6v5.6"/>',
  play: '<path d="M8.4 5.4 18 12 8.4 18.6z"/>',
  flag: '<path d="M6 20.4V4"/><path d="M6 5h10.2l-1.9 3.6 1.9 3.6H6"/>',
  arrowRight: '<path d="M4.8 12h13.6"/><path d="m13.2 7 5 5-5 5"/>',
  arrowLeft: '<path d="M19.2 12H5.6"/><path d="m10.8 7-5 5 5 5"/>',
  package:
    '<path d="m12 3.6 8 4.2v8.4l-8 4.2-8-4.2V7.8z"/><path d="m4 7.8 8 4.2 8-4.2"/><path d="M12 12v8.4"/>',
  wrench:
    '<path d="M14.4 4.6a3.6 3.6 0 0 0 4.8 4.6l1.8 1.8-3.4 3.4-1.8-1.8a3.6 3.6 0 0 0-4.6-4.8z"/><path d="m12.6 8.4-8 8V20h3.6l8-8"/>',
  phone:
    '<path d="M7 3.8h2.6l1.4 3.4-2 1.4a11 11 0 0 0 5.4 5.4l1.4-2 3.4 1.4V16a2 2 0 0 1-2 2C10.4 18 6 13.6 6 5.8a2 2 0 0 1 1-2z"/>',
  mail: '<rect x="3.6" y="5.4" width="16.8" height="13.2" rx="2.2"/><path d="m4.4 7 7.6 5.6L19.6 7"/>',
  eye: '<path d="M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6z"/><circle cx="12" cy="12" r="2.6"/>',
  eyeOff:
    '<path d="M4 4l16 16"/><path d="M9.6 9.7A2.6 2.6 0 0 0 12 14.6c.7 0 1.3-.2 1.8-.6"/><path d="M6.4 6.6C4.2 8.2 2.8 12 2.8 12s3.4 6 9.2 6c1.7 0 3.2-.5 4.5-1.2"/><path d="M19.6 15.4c1.1-1.2 1.6-3.4 1.6-3.4s-3.4-6-9.2-6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 3.6v2.1M12 18.3v2.1M4.6 12h2.1M17.3 12h2.1M6.7 6.7l1.5 1.5M15.8 15.8l1.5 1.5M17.3 6.7l-1.5 1.5M8.2 15.8l-1.5 1.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  seedling:
    '<path d="M12 20v-7"/><path d="M12 13c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6z"/><path d="M12 12.4c0-3.9 3.1-7 7-7 0 3.9-3.1 7-7 7z"/>',
};

export function icon(name, size = 18) {
  const body = PATHS[name] || PATHS.grid;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function starIcon(filled, size = 15) {
  const body = PATHS.star;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${
    filled ? 'currentColor' : 'none'
  }" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
