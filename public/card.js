// Skor kartını PNG olarak çizer (canvas; dış kütüphane yok). Düzen, ekrandaki rapor kartıyla aynıdır.
const CARD = { W: 900, H: 1050, SCALE: 2 };
const STATUS_GRAD = { pass: ['#6ee787', '#16a34a'], border: ['#fbbf24', '#f97316'], fail: ['#fb7185', '#dc2626'] };
const STATUS_MARK = { pass: '✔', border: '!', fail: '✕' };
const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

function icon(ctx, name, x, y, size, color, lw = 1.8) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  ctx.stroke(new Path2D(GLYPHS[name]));
  ctx.restore();
}

const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

function text(ctx, s, x, y, { size = 16, weight = 400, color = '#fff', align = 'left', italic = false, maxW } = {}) {
  let sz = size;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  const set = () => { ctx.font = `${italic ? 'italic ' : ''}${weight} ${sz}px ${FONT}`; };
  set();
  while (maxW && ctx.measureText(s).width > maxW && sz > 9) { sz -= 1; set(); }
  ctx.fillText(s, x, y);
}

function wrap(ctx, s, maxW) {
  const lines = [];
  let cur = '';
  for (const w of String(s).split(/\s+/)) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function gaugeArc(ctx, cx, cy, r, score, key) {
  ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.strokeStyle = '#d9e4e9';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, STATUS_GRAD[key][0]); g.addColorStop(1, STATUS_GRAD[key][1]);
  ctx.strokeStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (score / 100)); ctx.stroke();
}

function drawCard(d, photo) {
  const { W, H, SCALE } = CARD;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE; canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Arka plan + ışık eğrileri
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#04202b'); bg.addColorStop(1, '#0a3a49');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, 520);
  glow.addColorStop(0, 'rgba(25,195,180,.35)'); glow.addColorStop(1, 'rgba(25,195,180,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(79,216,255,.45)';
  ctx.beginPath(); ctx.moveTo(430, 0); ctx.quadraticCurveTo(700, 70, W, 40); ctx.stroke();
  ctx.strokeStyle = 'rgba(25,195,180,.35)';
  ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.quadraticCurveTo(300, H - 90, W, H - 20); ctx.stroke();

  // Üst bilgi
  const bars = [[34, 52, 9, 18], [48, 44, 9, 26], [62, 36, 9, 34], [76, 28, 9, 42]];
  const lg = ctx.createLinearGradient(34, 80, 90, 20); lg.addColorStop(0, '#19c3b4'); lg.addColorStop(1, '#4fd8ff');
  ctx.fillStyle = lg;
  for (const [x, y, w, h] of bars) { rr(ctx, x, y, w, h, 2); ctx.fill(); }
  ctx.strokeStyle = '#4fd8ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(28, 48); ctx.quadraticCurveTo(58, 44, 90, 22); ctx.stroke();
  text(ctx, 'ATS', 108, 68, { size: 46, weight: 800, italic: true });
  text(ctx, 'PRO', 108 + 92, 68, { size: 46, weight: 800, italic: true, color: '#19c3b4' });
  ctx.fillStyle = 'rgba(120,220,230,.4)'; ctx.fillRect(330, 28, 1.5, 50);
  text(ctx, 'CV ATS Test Raporu', 354, 64, { size: 30, weight: 700 });

  // Aday kartı
  const card = (x, y, w, h) => {
    rr(ctx, x, y, w, h, 20); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(120,220,230,.45)'; ctx.stroke();
  };
  card(28, 100, 844, 250);
  const cx = 118, cy = 190, pr = 62;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.clip();
  if (photo) {
    const s = Math.min(photo.width, photo.height);
    ctx.drawImage(photo, (photo.width - s) / 2, (photo.height - s) / 2, s, s, cx - pr, cy - pr, pr * 2, pr * 2);
  } else {
    const ag = ctx.createLinearGradient(cx - pr, cy - pr, cx + pr, cy + pr); ag.addColorStop(0, '#19c3b4'); ag.addColorStop(1, '#0e8f97');
    ctx.fillStyle = ag; ctx.fillRect(cx - pr, cy - pr, pr * 2, pr * 2);
    const ini = (d.candidate.name || 'CV').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr-TR');
    text(ctx, ini, cx, cy + 14, { size: 42, weight: 800, color: '#02242b', align: 'center' });
  }
  ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = 'rgba(120,220,230,.4)'; ctx.fillRect(208, 130, 1.5, 120);
  text(ctx, d.candidate.name || 'Aday', 232, 178, { size: 42, weight: 800, maxW: 470 });
  ctx.font = `700 22px ${FONT}`;
  const pillW = Math.min(ctx.measureText(d.candidate.title).width + 56, 470);
  rr(ctx, 232, 196, pillW, 44, 22); ctx.fillStyle = 'rgba(25,195,180,.15)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#19c3b4'; ctx.stroke();
  text(ctx, d.candidate.title, 232 + pillW / 2, 226, { size: 22, weight: 700, align: 'center', maxW: pillW - 30 });
  icon(ctx, 'docCheck', 748, 120, 86, '#4fd8ff', 1.4);

  const s = d.stats;
  const years = s.years >= 1 ? `${Math.round(s.years)} Yıl` : `${Math.round(s.years * 12)} Ay`;
  const lang = s.languages.length ? `Var (${s.languages.map((l) => l.name).join(', ')})` : 'Yok';
  const chips = [
    ['briefcase', 'Toplam Deneyim', years], ['cap', 'Eğitim', s.education || 'Belirsiz'], ['chat', 'Yabancı Dil', lang],
    ['medal', 'Sertifika', `${s.certificates} Adet`], ['layers', 'Kurs / Eğitim', `${s.courses} Adet`],
  ];
  const cw = (796 - 40) / 5;
  chips.forEach(([ic, k, v], i) => {
    const x = 52 + i * (cw + 10), y = 268;
    rr(ctx, x, y, cw, 62, 12); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(120,220,230,.4)'; ctx.stroke();
    icon(ctx, ic, x + 10, y + 18, 26, '#19c3b4');
    text(ctx, k, x + 44, y + 25, { size: 12, color: '#8fb3bb', maxW: cw - 50 });
    text(ctx, v, x + 44, y + 48, { size: 17, weight: 800, maxW: cw - 50 });
  });

  // Puan paneli
  const items = [{ name: 'Genel ATS Puanı', score: d.general.score, st: d.general.status }]
    .concat(d.positions.map((p) => ({ name: p.name, score: p.score, st: p.status })));
  rr(ctx, 28, 370, 844, 300, 22); ctx.fillStyle = '#f4f8fa'; ctx.fill();
  const colW = 844 / items.length;
  items.forEach((it, i) => {
    const mid = 28 + colW * i + colW / 2;
    if (i) { ctx.fillStyle = '#d5e1e6'; ctx.fillRect(28 + colW * i, 392, 1.5, 256); }
    gaugeArc(ctx, mid, 462, 58, it.score, it.st.key);
    text(ctx, String(it.score), mid, 474, { size: 40, weight: 900, color: '#0c1f2a', align: 'center' });
    text(ctx, '/ 100', mid, 496, { size: 15, weight: 600, color: '#0c1f2a', align: 'center' });
    rr(ctx, mid - colW / 2 + 14, 546, colW - 28, 54, 10); ctx.fillStyle = '#dceaf0'; ctx.fill();
    ctx.font = `800 17px ${FONT}`;
    const lines = wrap(ctx, it.name, colW - 44).slice(0, 2);
    lines.forEach((ln, li) => text(ctx, ln, mid, 573 + (li - (lines.length - 1) / 2) * 20, { size: 17, weight: 800, color: '#0c1f2a', align: 'center' }));
    const label = `${STATUS_MARK[it.st.key]} ${it.st.label}`;
    ctx.font = `800 15px ${FONT}`;
    const bw = ctx.measureText(label).width + 36;
    rr(ctx, mid - bw / 2, 620, bw, 32, 16); ctx.fillStyle = STATUS_GRAD[it.st.key][1]; ctx.fill();
    text(ctx, label, mid, 642, { size: 15, weight: 800, align: 'center' });
  });

  // Öncelikli düzenlemeler
  card(28, 690, 500, 300);
  icon(ctx, 'target', 48, 706, 40, '#19c3b4', 1.6);
  text(ctx, 'Öncelikli Düzenlemeler', 102, 738, { size: 26, weight: 800 });
  d.priorities.slice(0, 3).forEach((p, i) => {
    const y = 790 + i * 62;
    ctx.beginPath(); ctx.arc(70, y + 12, 18, 0, Math.PI * 2); ctx.fillStyle = '#0e8f97'; ctx.fill();
    text(ctx, String(i + 1), 70, y + 19, { size: 20, weight: 800, align: 'center' });
    ctx.font = `600 17px ${FONT}`;
    wrap(ctx, p, 410).slice(0, 2).forEach((ln, li) => text(ctx, ln, 104, y + 10 + li * 22, { size: 17, weight: 600 }));
  });

  // Rapor içeriği
  card(544, 690, 328, 300);
  icon(ctx, 'clipboard', 562, 706, 40, '#19c3b4', 1.6);
  text(ctx, 'Rapor İçeriği', 614, 738, { size: 26, weight: 800 });
  ['ATS Uyum Analizi', 'Puan ve Pozisyon Uyumu', 'Güçlü Yönler', 'Eksik ve Zayıf Alanlar', 'Anahtar Kelime Analizi', 'ATS Riskleri', 'Kişisel Geliştirme Önerileri']
    .forEach((t, i) => {
      const y = 786 + i * 29;
      text(ctx, '✔', 568, y, { size: 17, weight: 800, color: '#22c55e' });
      text(ctx, t, 594, y, { size: 17, weight: 600, maxW: 262 });
    });

  text(ctx, 'Kural tabanlı bir tahmindir; belirli bir firmanın ATS yazılımının gerçek puanı değildir.', W / 2, 1024, { size: 13, color: '#8fb3bb', align: 'center' });
  return canvas;
}
