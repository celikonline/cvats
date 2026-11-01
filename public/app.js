const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const GRAD = { pass: ['#6ee787', '#16a34a'], border: ['#fbbf24', '#f97316'], fail: ['#fb7185', '#dc2626'] };
let gid = 0;
let lastReport = null;
let photoImg = null;

$('logo').innerHTML = LOGO_SVG;

// Fotoğraf yalnızca tarayıcıda okunur ve küçültülür; sunucuya gönderilmez.
$('photo').addEventListener('change', (ev) => {
  const f = ev.target.files[0];
  photoImg = null;
  if (!f || !f.type.startsWith('image/')) return;
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = () => {
    const s = Math.min(img.width, img.height, 400);
    const c = document.createElement('canvas');
    c.width = c.height = s;
    c.getContext('2d').drawImage(img, (img.width - Math.min(img.width, img.height)) / 2, (img.height - Math.min(img.width, img.height)) / 2, Math.min(img.width, img.height), Math.min(img.width, img.height), 0, 0, s, s);
    photoImg = c;
    URL.revokeObjectURL(url);
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
});
const ICONS = { pass: '✔', border: '!', fail: '✕' };

fetch('/api/positions').then((r) => r.json()).then((list) => {
  $('positions').innerHTML = list.map((n) => `<option value="${esc(n)}">`).join('');
}).catch(() => {});

const drop = $('drop');
const fileInput = $('file');
const showFile = () => {
  const f = fileInput.files[0];
  $('dropText').innerHTML = f ? `${esc(f.name)} <small>(${(f.size / 1024).toFixed(0)} KB)</small>` : 'CV dosyasını sürükleyin veya seçin <small>(PDF, DOCX, TXT · en çok 4 MB)</small>';
};
fileInput.addEventListener('change', showFile);
['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (ev) => {
  if (ev.dataTransfer.files.length) { fileInput.files = ev.dataTransfer.files; showFile(); }
});

$('form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const err = $('error');
  err.hidden = true;
  const btn = $('submit');
  btn.disabled = true;
  btn.textContent = 'Analiz ediliyor…';
  try {
    const res = await fetch('/api/analyze', { method: 'POST', body: new FormData($('form')) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Analiz başarısız.');
    render(data);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analiz Et';
  }
});

function gauge(score, key) {
  const r = 54, c = 2 * Math.PI * r;
  return `<div class="gauge" role="img" aria-label="${score} / 100">
    <svg viewBox="0 0 120 120"><defs><linearGradient id="gg${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GRAD[key][0]}"/><stop offset="1" stop-color="${GRAD[key][1]}"/></linearGradient></defs>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#d9e4e9" stroke-width="12"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="url(#gg${gid++})" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - score / 100)).toFixed(1)}"/></svg>
    <div class="num">${score}<small>/ 100</small></div></div>`;
}

function scoreCard(name, score, st, tag) {
  return `<div class="score">${gauge(score, st.key)}<div class="score-name">${esc(name)}</div>
    <span class="badge ${st.key}">${ICONS[st.key]} ${esc(st.label)}</span>${tag ? `<div class="tag">${esc(tag)}</div>` : ''}</div>`;
}

const chips = (list, cls) => list.length ? `<div class="chips">${list.map((x) => `<span class="chip ${cls}">${esc(x)}</span>`).join('')}</div>` : '<p class="sub">—</p>';
const initials = (n) => (n || 'CV').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr-TR');
const barClass = (p) => (p >= 0.75 ? '' : p >= 0.5 ? 'warn' : 'bad');

function render(d) {
  const c = d.candidate, s = d.stats;
  const tgt = d.positions.find((p) => p.role === 'target');
  const lang = s.languages.length ? `Var (${s.languages.map((l) => l.name).join(', ')})` : 'Yok';
  const years = s.years >= 1 ? `${Math.round(s.years)} Yıl` : `${Math.round(s.years * 12)} Ay`;

  const gauges = [scoreCard('Genel ATS Puanı', d.general.score, d.general.status, null)]
    .concat(d.positions.map((p) => scoreCard(p.name, p.score, p.status, p.role === 'target' ? 'Hedef pozisyon' : null))).join('');

  $('report').innerHTML = `
    <section class="card cand">
      <div class="cand-top">
        <div class="avatar" aria-hidden="true">${photoImg ? `<img src="${photoImg.toDataURL('image/jpeg', 0.9)}" alt="">` : esc(initials(c.name))}</div>
        <div>
          <div class="cand-name">${esc(c.name || 'Aday')}</div>
          <span class="pill">${esc(c.title)}</span>
          <div class="cand-contact">${[c.email, c.phone, c.linkedin].filter(Boolean).map(esc).join(' · ') || 'İletişim bilgisi bulunamadı'}</div>
        </div>
        <span class="doc-ico">${svgIcon('docCheck', 76, 1.4)}</span>
      </div>
      <div class="stats">
        ${[['briefcase', 'Toplam Deneyim', years], ['cap', 'Eğitim', s.education || 'Belirsiz'], ['chat', 'Yabancı Dil', lang], ['medal', 'Sertifika', `${s.certificates} Adet`], ['layers', 'Kurs / Eğitim', `${s.courses} Adet`]]
          .map(([ic, k, v]) => `<div class="stat">${svgIcon(ic, 26)}<div><div class="k">${k}</div><div class="v">${esc(v)}</div></div></div>`).join('')}
      </div>
    </section>

    <section class="scores" style="grid-template-columns:repeat(${Math.min(4, 1 + d.positions.length)},1fr)">${gauges}</section>
    ${d.meta.targetInferred ? '<p class="muted">Pozisyon girmediğiniz için CV\'nize en uygun profil hedef alındı.</p>' : ''}
    ${d.warnings.map((w) => `<p class="error">${esc(w)}</p>`).join('')}

    <div class="two">
      <section class="card"><h2>${svgIcon('target', 34, 1.6)}Öncelikli Düzenlemeler</h2>
        <ol class="prio">${d.priorities.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></section>
      <section class="card"><h2>${svgIcon('clipboard', 34, 1.6)}Rapor İçeriği</h2>
        <ul class="checks">${['ATS Uyum Analizi', 'Puan ve Pozisyon Uyumu', 'Güçlü Yönler', 'Eksik ve Zayıf Alanlar', 'Anahtar Kelime Analizi', 'ATS Riskleri', 'Kişisel Geliştirme Önerileri'].map((x) => `<li>${x}</li>`).join('')}</ul></section>
    </div>

    <section class="card detail">
      <h2>${svgIcon('chart', 34, 2.4)}Detaylı Analiz Raporu</h2>
      <h3>1. ATS Uyum Analizi</h3>
      <p>${esc(d.summary)}</p>
      ${d.general.breakdown.map((b) => {
        const p = b.score / b.max;
        return `<div class="bar"><span>${esc(b.label)}</span><span class="track"><span class="fill ${barClass(p)}" style="display:block;width:${Math.round(p * 100)}%"></span></span><b>${b.score}/${b.max}</b></div>`;
      }).join('')}
      <p class="sub">Dosya: ${esc(d.meta.fileName)} · ${d.meta.pagesEstimated ? '≈' : ''}${d.meta.pages} sayfa · ${d.meta.wordCount} kelime</p>

      <h3>2. Puan ve Pozisyon Uyumu</h3>
      ${d.positions.length ? `<ul>${d.positions.map((p) => `<li><b>${esc(p.name)}</b>: ${p.score}/100 (${esc(p.status.label)}) · anahtar kelime kapsamı %${p.coverage}</li>`).join('')}</ul>
      <p class="sub">GEÇTİ ≥ 75 · SINIRDA 60-74 · ELENDİ &lt; 60. Puan: anahtar kelime (55) + unvan (15) + deneyim/eğitim (15) + genel CV kalitesi (15).</p>` : '<p>Pozisyon uyumu için hedef pozisyon veya iş ilanı girin.</p>'}

      <h3>3. Güçlü Yönler</h3>
      <ul>${d.strengths.map((x) => `<li><b>${esc(x.title)}</b> — ${esc(x.detail)}</li>`).join('') || '<li>Belirgin bir güçlü yön tespit edilemedi.</li>'}</ul>

      <h3>4. Eksik ve Zayıf Alanlar</h3>
      <ul>${d.weaknesses.map((x) => `<li><b>${esc(x.title)}</b> — ${esc(x.detail)}<br><span class="sub">Öneri: ${esc(x.action)}${x.generic ? ' (genel öneri)' : ''}</span></li>`).join('')}</ul>

      <h3>5. Anahtar Kelime Analizi</h3>
      ${tgt ? `<p>${esc(tgt.name)} için bulunan kelimeler:</p>${chips(tgt.matched, 'ok')}<p>Eksik veya yeterince vurgulanmamış kelimeler:</p>${chips(tgt.missing, 'miss')}
      ${tgt.jdKeywords ? `<p class="sub">İlandan çıkarılan kelimeler: ${tgt.jdKeywords.map(esc).join(', ')}</p>` : ''}` : '<p>Hedef pozisyon girilmediği için anahtar kelime analizi yapılamadı.</p>'}

      <h3>6. ATS Riskleri</h3>
      ${d.risks.length ? d.risks.map((r) => `<div class="risk ${r.level}"><b>${{ high: 'Yüksek', medium: 'Orta', low: 'Düşük' }[r.level]} risk: ${esc(r.title)}</b>${esc(r.detail)}</div>`).join('') : '<p>Belirgin bir ATS elenme riski tespit edilmedi.</p>'}

      <h3>7. Kişisel Geliştirme Önerileri</h3>
      <ul>${d.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    </section>

    <div class="actions no-print">
      <button class="btn" id="png">Skor kartını PNG indir</button>
      <button class="btn" id="print">PDF olarak kaydet / yazdır</button>
      <button class="btn ghost" id="again">Yeni analiz</button>
    </div>`;

  $('formCard').hidden = true;
  $('report').hidden = false;
  lastReport = d;
  $('print').onclick = () => window.print();
  $('png').onclick = () => {
    drawCard(lastReport, photoImg).toBlob((blob) => {
      const a = document.createElement('a');
      const slug = (c.name || 'cv').toLocaleLowerCase('tr-TR').replace(/[^a-z0-9ığüşöç]+/g, '-').replace(/^-|-$/g, '');
      a.href = URL.createObjectURL(blob);
      a.download = `ats-skor-karti-${slug || 'cv'}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };
  $('again').onclick = () => { $('report').hidden = true; $('formCard').hidden = false; window.scrollTo(0, 0); };
  window.scrollTo(0, 0);
}
