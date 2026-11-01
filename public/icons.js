// 24x24 çizgi ikonlar. Hem satır içi SVG hem de canvas (Path2D) tarafından kullanılır.
const GLYPHS = {
  briefcase: 'M3 7h18v13H3z M9 7V4h6v3 M3 13h18',
  cap: 'M2 9l10-5 10 5-10 5z M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5',
  chat: 'M4 5h16v11H10l-6 4z M8 10h8',
  medal: 'M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M8.5 14.5L7 21l5-3 5 3-1.5-6.5',
  layers: 'M12 3l9 5-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z M12 11.5v1',
  clipboard: 'M6 5h12v16H6z M9 3h6v4H9z M9 13l2 2 4-4',
  chart: 'M5 20v-8 M12 20V5 M19 20V9',
  docCheck: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 15l2 2 4-4',
};

const svgIcon = (name, size = 24, width = 1.8) =>
  `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[name].split(' M').map((d, i) => `<path d="${i ? 'M' : ''}${d}"/>`).join('')}</svg>`;

// ATS PRO logosu: yükselen çubuklar + ok.
const LOGO_SVG = `<svg class="logo-svg" viewBox="0 0 64 56" width="52" height="46" aria-hidden="true">
  <defs><linearGradient id="lg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#19c3b4"/><stop offset="1" stop-color="#4fd8ff"/></linearGradient></defs>
  <rect x="8" y="34" width="8" height="16" rx="2" fill="url(#lg)"/><rect x="21" y="26" width="8" height="24" rx="2" fill="url(#lg)"/>
  <rect x="34" y="18" width="8" height="32" rx="2" fill="url(#lg)"/><rect x="47" y="10" width="8" height="40" rx="2" fill="url(#lg)"/>
  <path d="M2 30c14-2 28-10 42-24" fill="none" stroke="#4fd8ff" stroke-width="3" stroke-linecap="round"/><path d="M36 5l9-1-3 9" fill="none" stroke="#4fd8ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
