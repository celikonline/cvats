// CV metnini bölümlere ayırır ve ATS'nin çıkaracağı alanları (iletişim, deneyim süresi,
// eğitim, dil, sertifika...) bulur. Kural tabanlıdır; Türkçe ve İngilizce başlıkları tanır.
import { fold, words } from './text.js';
import { EDU_LEVELS } from './positions.js';

const HEADINGS = {
  summary: ['ozet', 'profesyonel ozet', 'kisisel ozet', 'profil', 'hakkimda', 'kariyer hedefi', 'summary', 'professional summary', 'profile', 'about me', 'objective', 'career objective'],
  experience: ['is deneyimi', 'is deneyimleri', 'deneyim', 'deneyimler', 'tecrube', 'is tecrubesi', 'profesyonel deneyim', 'calisma gecmisi', 'is gecmisi', 'experience', 'work experience', 'professional experience', 'employment history', 'career history'],
  education: ['egitim', 'egitim bilgileri', 'egitim durumu', 'ogrenim', 'ogrenim bilgileri', 'akademik gecmis', 'education', 'academic background'],
  skills: ['yetenekler', 'beceriler', 'yetkinlikler', 'teknik beceriler', 'teknik yetkinlikler', 'temel yetkinlikler', 'uzmanlik alanlari', 'bilgisayar bilgisi', 'skills', 'technical skills', 'core competencies', 'key skills', 'competencies'],
  certifications: ['sertifikalar', 'sertifika', 'sertifikalar ve belgeler', 'belgeler', 'sertifikalar ve kurslar', 'kurslar ve sertifikalar', 'kurs ve sertifikalar', 'certifications', 'certificates', 'licenses'],
  courses: ['kurslar', 'kurs', 'kurslar ve egitimler', 'kurs ve egitimler', 'egitimler ve kurslar', 'seminerler', 'courses', 'trainings', 'training'],
  languages: ['yabanci dil', 'yabanci diller', 'diller', 'dil bilgisi', 'languages', 'language skills'],
  projects: ['projeler', 'projects'],
  references: ['referanslar', 'references'],
  other: ['kisisel bilgiler', 'hobiler', 'ilgi alanlari', 'askerlik', 'interests', 'hobbies', 'personal information'],
};

const HEADING_LOOKUP = new Map();
for (const [key, list] of Object.entries(HEADINGS)) for (const h of list) HEADING_LOOKUP.set(h, key);

export function headingKey(line) {
  const f = fold(line).replace(/[^a-z& ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!f || f.length > 40) return null;
  return HEADING_LOOKUP.get(f) || null;
}

function splitSections(lines) {
  const sections = { header: [] };
  let cur = 'header';
  for (const line of lines) {
    const key = headingKey(line);
    if (key) {
      cur = key;
      sections[cur] ||= [];
      continue;
    }
    (sections[cur] ||= []).push(line);
  }
  return sections;
}

// ---- Deneyim süresi -------------------------------------------------------

const MONTHS = {
  ocak: 1, oca: 1, subat: 2, sub: 2, mart: 3, mar: 3, nisan: 4, nis: 4, mayis: 5, may: 5, haziran: 6, haz: 6,
  temmuz: 7, tem: 7, agustos: 8, agu: 8, eylul: 9, eyl: 9, ekim: 10, eki: 10, kasim: 11, kas: 11, aralik: 12, ara: 12,
  january: 1, jan: 1, february: 2, feb: 2, march: 3, april: 4, apr: 4, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};
const MONTH_ALT = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const PRESENT = '(?:gunumuz\\w*|devam(?:\\s+ediyor)?|halen|hala|su\\s*an|simdi|present|current|now|ongoing)';
const TOK = `(?<!\\d)(?:\\d{1,2}\\s*[./-]\\s*\\d{4}|(?:${MONTH_ALT})\\.?\\s*,?\\s*\\d{4}|\\d{4})(?!\\d)`;
const RANGE_RE = new RegExp(`(${TOK})\\s*(?:-|to|ile)\\s*(${TOK}|${PRESENT})`, 'g');

function parseTok(tok, now, isEnd) {
  if (new RegExp(`^${PRESENT}$`).test(tok)) return now.getFullYear() * 12 + now.getMonth() + 1;
  let m = tok.match(/^(\d{1,2})\s*[./-]\s*(\d{4})$/);
  if (m) {
    const mo = +m[1];
    return mo >= 1 && mo <= 12 ? +m[2] * 12 + mo : null;
  }
  m = tok.match(new RegExp(`^(${MONTH_ALT})\\.?\\s*,?\\s*(\\d{4})$`));
  if (m) return +m[2] * 12 + MONTHS[m[1]];
  m = tok.match(/^(\d{4})$/);
  if (m) return +m[1] * 12 + 1; // yalnız yıl: Ocak kabul edilir
  return null;
}

export function experienceMonths(text, now = new Date()) {
  const f = fold(text);
  const maxIdx = now.getFullYear() * 12 + now.getMonth() + 1;
  const minIdx = 1970 * 12;
  const spans = [];
  const kinds = new Set();
  for (const m of f.matchAll(RANGE_RE)) {
    const a = parseTok(m[1], now);
    const b = parseTok(m[2], now);
    if (a == null || b == null || a < minIdx || b > maxIdx + 12 || b < a) continue;
    spans.push([a, Math.max(b, a + 1)]);
    for (const t of [m[1], m[2]]) {
      kinds.add(/^\d{4}$/.test(t) ? 'yil' : /^\d/.test(t) ? 'sayi' : new RegExp(`^(${MONTH_ALT})`).test(t) ? 'ay-adi' : 'guncel');
    }
  }
  spans.sort((x, y) => x[0] - y[0]);
  let total = 0;
  let curEnd = -Infinity;
  let curStart = 0;
  for (const [s, e] of spans) {
    if (s > curEnd) {
      if (curEnd > -Infinity) total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else curEnd = Math.max(curEnd, e);
  }
  if (curEnd > -Infinity) total += curEnd - curStart;
  const dateKinds = [...kinds].filter((k) => k !== 'guncel');
  return { months: total, ranges: spans.length, formatMix: dateKinds.length > 1 };
}

// ---- Eğitim / dil / iletişim ----------------------------------------------

export function detectEducation(text) {
  const f = fold(text);
  if (/doktora|\bphd\b|ph\.d|doctorate/.test(f)) return 'Doktora';
  if (/yuksek lisans|lisansustu|\bmaster\b|\bmsc\b|\bmba\b|\bm\.sc/.test(f)) return 'Yüksek Lisans';
  if (/(?<!yuksek )(?<!on)lisans|bachelor|\bbsc\b|\bb\.sc|universite|university|fakulte/.test(f)) return 'Lisans';
  if (/on\s?lisans|meslek yuksekokulu|associate|\bmyo\b/.test(f)) return 'Önlisans';
  if (/\blise\b|high school/.test(f)) return 'Lise';
  return null;
}

const LANGS = [
  ['İngilizce', /ingilizce|english/], ['Almanca', /almanca|german|deutsch/], ['Fransızca', /fransizca|french/],
  ['İspanyolca', /ispanyolca|spanish/], ['Rusça', /rusca|russian/], ['Arapça', /arapca|arabic/],
  ['İtalyanca', /italyanca|italian/], ['Japonca', /japonca|japanese/], ['Çince', /cince|chinese|mandarin/],
];
const LEVEL_RE = /\b([abc][12])\b|ileri|orta|temel|baslangic|advanced|intermediate|fluent|native|basic|upper|anadil|akici|iyi/;

export function detectLanguages(lines) {
  const found = [];
  for (const [name, re] of LANGS) {
    for (const line of lines) {
      const f = fold(line);
      if (re.test(f)) {
        const lv = f.match(LEVEL_RE);
        found.push({ name, level: lv ? lv[0] : null });
        break;
      }
    }
  }
  return found;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3,4}\)?[\s.-]?)\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/;
const LINKEDIN_RE = /linkedin\.com\/(?:in|pub)\/[\w%-]+/i;

function guessName(lines) {
  for (const line of lines.slice(0, 6)) {
    if (!line || /[@\d]/.test(line) || headingKey(line)) continue;
    const w = line.split(/\s+/);
    if (w.length >= 2 && w.length <= 4 && line.length < 40 && w.every((x) => /^[\p{L}.'-]+$/u.test(x))) return line;
  }
  return null;
}

// ---- Deneyim içeriği ------------------------------------------------------

const BULLET_RE = /^[-•*▪●◦·▸►✓✔–]\s*/;
const ACTION_STEMS = [
  'yonet', 'gelistir', 'hazirla', 'olustur', 'uygula', 'artir', 'azalt', 'dusur', 'tasarla', 'planla', 'koordine',
  'raporla', 'denetle', 'analiz', 'optimize', 'sagla', 'tamamla', 'kurdum', 'kurul', 'yurut', 'takip', 'organize',
  'egit', 'musteri', 'lead', 'led ', 'manag', 'develop', 'implement', 'increas', 'reduc', 'deliver', 'built',
  'creat', 'improv', 'launch', 'achiev', 'negotiat', 'analyz', 'streamlin', 'coordinat', 'prepar', 'maintain',
  'kisalt', 'iyilestir', 'kazandir', 'basar', 'entegre', 'otomatiz', 'migrasyon', 'gecis',
];
const QUANT_RE = /\d[\d.,]*\s?(%|₺|\$|€|tl\b|usd|eur|milyon|bin\b|k\b|kisi|adet|musteri|proje|firma|sube|gun|saat|ay\b|yil|fatura|kayit)|%\s?\d|\d+\s?\+/;

export function analyseExperienceLines(lines) {
  const desc = [];
  for (const raw of lines) {
    const bulleted = BULLET_RE.test(raw);
    const text = raw.replace(BULLET_RE, '').trim();
    if (!text) continue;
    if (bulleted || words(text) >= 6) desc.push(text);
  }
  let action = 0;
  let quant = 0;
  let weak = 0;
  for (const t of desc) {
    const f = fold(t);
    if (ACTION_STEMS.some((s) => f.includes(s))) action++;
    if (QUANT_RE.test(f)) quant++;
    if (/sorumluydum|sorumlu idim|responsible for|gorev aldim|gorevliydim/.test(f)) weak++;
  }
  return { count: desc.length, action, quant, weak };
}

// ---- Ana giriş -------------------------------------------------------------

const countItems = (lines) => lines.filter((l) => l.replace(BULLET_RE, '').trim().length >= 4).length;
const splitItems = (lines) =>
  lines.flatMap((l) => l.replace(BULLET_RE, '').split(/[,;•|·]|\s-\s/)).map((s) => s.trim()).filter((s) => s.length >= 2);

export function parseCv(text, now = new Date()) {
  const lines = text.split('\n').map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);
  const sections = splitSections(lines);
  const has = (k) => (sections[k] || []).some(Boolean);
  const sec = (k) => (sections[k] || []).filter(Boolean);

  // Deneyim süresi: önce deneyim bölümü; yoksa eğitim/sertifika dışındaki tüm metin.
  let expText = sec('experience').join('\n');
  let exp = experienceMonths(expText, now);
  if (!exp.ranges) {
    const rest = ['header', 'summary', 'projects', 'other']
      .flatMap((k) => sec(k)).join('\n');
    exp = experienceMonths(rest, now);
  }

  const eduText = has('education') ? sec('education').join('\n') : text;
  const langLines = has('languages') ? sec('languages') : nonEmpty;
  const summaryText = sec('summary').join(' ');
  const certLines = sec('certifications');
  const courseLines = sec('courses');
  const skillItems = splitItems(sec('skills'));
  const expLines = analyseExperienceLines(sec('experience').length ? sec('experience') : []);

  return {
    sections: Object.fromEntries(
      ['summary', 'experience', 'education', 'skills', 'certifications', 'courses', 'languages']
        .map((k) => [k, has(k)]),
    ),
    name: guessName(nonEmpty),
    email: (text.match(EMAIL_RE) || [null])[0],
    phone: (text.replace(EMAIL_RE, ' ').match(PHONE_RE) || [null])[0],
    linkedin: (text.match(LINKEDIN_RE) || [null])[0],
    experience: { ...exp, years: Math.round((exp.months / 12) * 10) / 10 },
    education: detectEducation(eduText),
    eduRank: EDU_LEVELS.indexOf(detectEducation(eduText)),
    languages: detectLanguages(langLines),
    certificates: countItems(certLines),
    courses: countItems(courseLines),
    skills: { count: skillItems.length, items: skillItems.slice(0, 40) },
    summaryWords: words(summaryText),
    expLines,
    wordCount: words(text),
    lineCount: nonEmpty.length,
  };
}
