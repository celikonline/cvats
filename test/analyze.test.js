import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extractText } from '../src/extract.js';
import { analyze } from '../src/analyze.js';
import { fold, matchKeyword } from '../src/text.js';
import { experienceMonths } from '../src/parse.js';

const NOW = new Date('2026-11-01');
const sample = fs.readFileSync(fileURLToPath(new URL('./fixtures/sample-cv.txt', import.meta.url)));

async function run(opts = {}) {
  const meta = await extractText(sample, 'sample-cv.txt');
  return analyze({ text: meta.text, meta: { ...meta, fileName: 'sample-cv.txt' }, now: NOW, ...opts });
}

test('fold: Türkçe karakterleri sadeleştirir', () => {
  assert.equal(fold('İŞ DENEYİMİ Çağrı'), 'is deneyimi cagri');
  assert.equal(matchKeyword(fold('KDV beyannamesi'), fold('kdv|vergi')), 'kdv');
  assert.equal(matchKeyword(fold('sapma analizi'), 'sap'), null); // kısa kısaltma kelime sınırı
});

test('deneyim süresi: çakışan aralıklar bir kez sayılır', () => {
  const r = experienceMonths('01/2020 - 12/2021\n06/2021 - 06/2022', NOW);
  assert.equal(r.months, (2022 * 12 + 6) - (2020 * 12 + 1));
  assert.equal(experienceMonths('Ocak 2018 - Günümüz', NOW).months, (2026 * 12 + 11) - (2018 * 12 + 1));
});

test('örnek CV: alanlar doğru çıkarılır', async () => {
  const r = await run({ target: 'Muhasebe Uzmanı' });
  assert.equal(r.candidate.name, 'Deniz Örnek');
  assert.equal(r.candidate.email, 'deniz.ornek@example.com');
  assert.ok(r.candidate.linkedin);
  assert.ok(Math.round(r.stats.years) === 8, `yıl: ${r.stats.years}`);
  assert.equal(r.stats.education, 'Lisans');
  assert.equal(r.stats.languages[0].name, 'İngilizce');
  assert.equal(r.stats.certificates, 3);
  assert.equal(r.stats.courses, 2);
});

test('örnek CV: hedef pozisyon geçer, üst pozisyon daha düşük puan alır', async () => {
  const r = await run({ target: 'Muhasebe Uzmanı' });
  const target = r.positions.find((p) => p.role === 'target');
  const mgr = r.positions.find((p) => p.name === 'Muhasebe Müdürü');
  assert.ok(r.general.score >= 75, `genel: ${r.general.score}`);
  assert.ok(target.score >= 75, `hedef: ${target.score}`);
  assert.ok(mgr && mgr.score < target.score);
  assert.equal(r.positions.length, 3);
  assert.ok(r.weaknesses.length >= 5);
  assert.equal(r.priorities.length, 3);
});

test('hedef verilmezse en uygun profil seçilir', async () => {
  const r = await run();
  assert.equal(r.meta.targetInferred, true);
  assert.equal(r.positions[0].name, 'Muhasebe Uzmanı');
});

test('boş / okunamayan CV yüksek riskle işaretlenir', () => {
  const r = analyze({ text: 'abc', meta: { pages: 1, format: 'pdf', tables: 0, images: 0, fileName: 'x.pdf' }, now: NOW });
  assert.ok(r.general.score < 30);
  assert.ok(r.risks.some((x) => x.level === 'high'));
});

test('iş ilanı anahtar kelimeleri hedef puana katılır', async () => {
  const jd = 'Konsolidasyon ve transfer fiyatlandırma deneyimi olan muhasebe uzmanı aranıyor. Konsolidasyon raporları hazırlanacaktır.';
  const r = await run({ target: 'Muhasebe Uzmanı', jobDescription: jd });
  const t = r.positions.find((p) => p.role === 'target');
  assert.ok(t.jdKeywords.includes('konsolidasyon'));
  assert.ok(t.missing.includes('konsolidasyon'));
});
