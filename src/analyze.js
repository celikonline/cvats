import { fold, matchKeyword, stemMatch, words } from './text.js';
import { POSITIONS, EDU_LEVELS, matchProfile, byId } from './positions.js';
import { parseCv } from './parse.js';
import { scoreGeneral, status } from './score.js';

const STOP = new Set(`ve ile veya icin gibi olarak olan bir bu su daha cok en de da ki mi ise ancak ayrica
tum her bazi kadar sonra once uzere ilgili sahip arayan aranmaktadir tercih nedeni oncelikli
the and for with you our are will have has that this from your their into such other more about
who what when where which work working ability experience years year team looking required
requirements responsibilities qualifications job position candidate candidates company`.split(/\s+/));

// İş ilanından en sık geçen anlamlı kelimeleri çıkarır.
export function extractJdKeywords(jd, limit = 20) {
  const freq = new Map();
  for (const m of jd.matchAll(/[\p{L}\p{N}#+.]{3,}/gu)) {
    const original = m[0].replace(/\.+$/, '');
    const f = fold(original);
    if (f.length < 4 && !/^[a-z]{2,4}$/.test(f) || STOP.has(f) || /^\d+$/.test(f)) continue;
    if (f.length < 4 && original !== original.toUpperCase()) continue; // kısa kelimeler yalnız kısaltma ise
    const e = freq.get(f) || { count: 0, label: original.toLocaleLowerCase('tr-TR'), order: freq.size };
    e.count++;
    freq.set(f, e);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].order - b[1].order)
    .slice(0, limit)
    .map(([f, e]) => ({ label: e.label, spec: f, stem: true, weight: 2 }));
}

function scorePosition(profile, keywords, folded, cv, general) {
  const matched = [];
  const missing = [];
  let hit = 0;
  let total = 0;
  for (const k of keywords) {
    total += k.weight;
    const ok = k.stem ? stemMatch(folded, k.spec) : matchKeyword(folded, k.spec);
    if (ok) { hit += k.weight; matched.push(k); } else missing.push(k);
  }
  const coverage = total ? hit / total : 0;
  const kwPts = Math.min(1, coverage / 0.7) * 55;
  const titlePts = profile.foldedNames.some((n) => new RegExp(`(?<![a-z])${n}`).test(folded)) ? 15 : 0;
  const yearsPts = Math.min(1, cv.experience.years / Math.max(profile.minYears, 0.1)) * 10;
  const need = EDU_LEVELS.indexOf(profile.minEdu);
  const eduPts = cv.eduRank >= need ? 5 : cv.eduRank === need - 1 ? 2 : 0;
  const score = Math.round(kwPts + titlePts + yearsPts + eduPts + (general / 100) * 15);
  return { score, coverage, matched, missing, titleFound: titlePts > 0, yearsOk: cv.experience.years >= profile.minYears, eduOk: cv.eduRank >= need };
}

const labels = (list) => list.map((k) => k.label);

export function analyze({ text, meta, target = '', jobDescription = '', now = new Date() }) {
  const m = { ...meta, text, wordCount: words(text) };
  const cv = parseCv(text, now);
  const folded = fold(text);
  const general = scoreGeneral(m, cv);

  // Hedef pozisyon: kullanıcı girdisi → profil; yoksa en uygun profil seçilir.
  const jd = jobDescription.trim();
  const jdKeywords = jd ? extractJdKeywords(jd) : [];
  let profile = matchProfile(target);
  let inferred = false;
  const all = POSITIONS.map((p) => ({ p, r: scorePosition(p, p.keywords, folded, cv, general.score) }));
  if (!profile && !target.trim() && !jd) {
    profile = all.sort((a, b) => b.r.score - a.r.score)[0].p;
    inferred = true;
  }

  const warnings = [];
  const positions = [];
  let targetResult = null;
  const targetName = target.trim() || profile?.name || 'Hedef Pozisyon';

  if (profile || jdKeywords.length) {
    const base = profile || { id: 'custom', name: targetName, foldedNames: [fold(targetName)], minYears: 0, minEdu: 'Lise' };
    const keywords = [...(profile ? profile.keywords : []), ...jdKeywords.filter((j) => !(profile?.keywords || []).some((k) => k.spec.split('|').includes(j.spec)))];
    targetResult = scorePosition(base, keywords, folded, cv, general.score);
    positions.push({
      id: base.id, name: profile?.name || targetName, role: 'target', score: targetResult.score, status: status(targetResult.score),
      coverage: Math.round(targetResult.coverage * 100), matched: labels(targetResult.matched), missing: labels(targetResult.missing),
      checks: { title: targetResult.titleFound, years: targetResult.yearsOk, education: targetResult.eduOk, minYears: base.minYears, minEdu: base.minEdu },
    });
    if (jdKeywords.length) positions[0].jdKeywords = labels(jdKeywords);
  } else if (target.trim()) {
    warnings.push(`"${target.trim()}" için hazır bir profil yok. Pozisyon uyumunu ölçmek için iş ilanını yapıştırın.`);
  }

  // İlişkili / alternatif pozisyonlar (en fazla 2).
  const others = all.filter(({ p }) => p.id !== profile?.id);
  const rel = (profile?.related || []).map((id) => others.find(({ p }) => p.id === id)).filter(Boolean);
  const rest = others.filter((o) => !rel.includes(o)).sort((a, b) => b.r.score - a.r.score);
  for (const { p, r } of [...rel, ...rest].slice(0, 2)) {
    positions.push({ id: p.id, name: p.name, role: 'related', score: r.score, status: status(r.score), coverage: Math.round(r.coverage * 100), matched: labels(r.matched), missing: labels(r.missing) });
  }

  // Bulgular
  const { strengths, weaknesses, risks } = general.findings;
  const tgt = positions.find((p) => p.role === 'target');
  if (tgt) {
    if (tgt.coverage >= 60) strengths.push({ title: `${tgt.name} anahtar kelimeleri`, detail: `Hedef pozisyon kelimelerinin %${tgt.coverage}'i CV'de geçiyor: ${tgt.matched.slice(0, 6).join(', ')}.` });
    else {
      const lost = Math.round((60 - tgt.coverage) / 6);
      weaknesses.push({ title: 'Hedef pozisyon anahtar kelimeleri eksik', detail: `Kelime kapsama oranı %${tgt.coverage}. Eksik: ${tgt.missing.slice(0, 6).join(', ')}.`, action: 'Hedef pozisyona uygun anahtar kelimeleri ekleyin.', priority: Math.max(lost, 4) });
      if (tgt.coverage < 40) risks.push({ level: 'high', title: 'Düşük anahtar kelime eşleşmesi', detail: 'ATS filtreleri ilan kelimelerine göre sıralar; %40 altı kapsama genellikle ilk elemede düşer.' });
    }
    if (!tgt.checks.title) weaknesses.push({ title: 'Hedef unvan CV\'de geçmiyor', detail: `"${tgt.name}" ifadesi metinde bulunamadı.`, action: 'Hedef unvanı CV başlığında ve özet bölümünde açıkça yazın.', priority: 5 });
    else strengths.push({ title: 'Unvan uyumu', detail: `"${tgt.name}" unvanı CV'de geçiyor.` });
    if (profile && !tgt.checks.years) risks.push({ level: 'medium', title: 'Deneyim süresi pozisyonun altında', detail: `${profile.name} için genelde en az ${profile.minYears} yıl aranır; CV'de ≈${cv.experience.years} yıl okunuyor.` });
    if (profile && !tgt.checks.education) risks.push({ level: 'medium', title: 'Eğitim seviyesi pozisyonun altında', detail: `${profile.name} için en az ${profile.minEdu} düzeyi beklenir.` });
  }

  weaknesses.sort((a, b) => b.priority - a.priority);
  const GENERIC = [
    ['ATS dostu dosya adı', 'Dosya adı kolay okunur olmalı.', 'Dosyayı "Ad-Soyad-CV.pdf" biçiminde adlandırın.'],
    ['Başlık hiyerarşisi', 'Bölümler arasında tutarlı başlık biçimi ATS ayrıştırmasını kolaylaştırır.', 'Tüm bölüm başlıklarını aynı biçimde (büyük harf, kalın) yazın.'],
    ['İlana özel uyarlama', 'Her başvuruda ilan kelimelerini yansıtmak eşleşmeyi artırır.', 'Her başvuru için özet ve beceri bölümünü ilana göre uyarlayın.'],
    ['Kısaltma + açılım', 'ATS hem kısaltmayı hem açılımı arayabilir.', 'Kısaltmaları ilk geçtiği yerde açılımıyla yazın (ör. Katma Değer Vergisi (KDV)).'],
    ['Tek sütun düzen', 'Çok sütunlu şablonlar sıralamayı bozabilir.', 'Tek sütunlu, sade bir şablon kullanın.'],
  ];
  for (const [title, detail, action] of GENERIC) {
    if (weaknesses.length >= 5) break;
    weaknesses.push({ title, detail, action, priority: 0, generic: true });
  }

  const priorities = [...new Set(weaknesses.filter((w) => w.priority > 0).map((w) => w.action))].slice(0, 3);
  for (const w of weaknesses) if (priorities.length < 3 && !priorities.includes(w.action)) priorities.push(w.action);

  const tips = [];
  if (tgt?.missing.length) tips.push(`${tgt.missing.slice(0, 4).join(', ')} konularında deneyiminiz varsa CV'ye ekleyin; yoksa kısa bir kurs/sertifika ile geliştirin.`);
  if (!cv.languages.length) tips.push('Yabancı dil seviyenizi belgeleyin (ör. TOEFL/YDS) ve CV\'ye ekleyin.');
  if (cv.expLines.quant < 4) tips.push('Her iş için en az bir ölçülebilir sonuç (%, ₺, süre, adet) hazırlayın.');
  tips.push('Her başvuruda ilan metnindeki 5-8 kritik kelimeyi özet ve beceriler bölümünüze doğal biçimde yerleştirin.');
  tips.push('LinkedIn profilinizi CV ile aynı unvan ve tarihlerle güncel tutun.');

  const readable = general.breakdown.find((b) => b.id === 'format').score >= 14;
  const summary = `CV'niz ATS sistemleri tarafından ${readable ? 'sorunsuz okunabiliyor' : 'kısmen okunabiliyor'}. Genel ATS puanınız ${general.score}/100 (${general.status.label}).` +
    (tgt ? ` ${tgt.name} pozisyonu için uyum puanınız ${tgt.score}/100; anahtar kelime kapsamanız %${tgt.coverage}.` : '');

  return {
    meta: { fileName: meta.fileName, format: meta.format, pages: meta.pages, pagesEstimated: !!meta.pagesEstimated, wordCount: m.wordCount, targetInferred: inferred },
    candidate: { name: cv.name, email: cv.email, phone: cv.phone, linkedin: cv.linkedin, title: tgt?.name || targetName },
    stats: {
      years: cv.experience.years, education: cv.education, languages: cv.languages, certificates: cv.certificates,
      courses: cv.courses, skills: cv.skills.count,
    },
    general: { score: general.score, status: general.status, breakdown: general.breakdown.map(({ id, label, max, score, notes }) => ({ id, label, max, score, notes })) },
    positions,
    strengths: strengths.slice(0, 8),
    weaknesses: weaknesses.map(({ title, detail, action, generic }) => ({ title, detail, action, generic: !!generic })),
    risks: risks.sort((a, b) => ['high', 'medium', 'low'].indexOf(a.level) - ['high', 'medium', 'low'].indexOf(b.level)),
    priorities,
    tips,
    summary,
    warnings,
  };
}
