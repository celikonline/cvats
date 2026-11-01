// Genel ATS puanı (hedef pozisyondan bağımsız): biçim, iletişim, yapı, deneyim, eğitim,
// uzunluk/özet ve beceriler olmak üzere 7 bileşenden 100 puan.
import { words } from './text.js';

export const status = (score) =>
  score >= 75 ? { key: 'pass', label: 'GEÇTİ' } : score >= 60 ? { key: 'border', label: 'SINIRDA' } : { key: 'fail', label: 'ELENDİ' };

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Her bileşen {label, max, score, checks:[{ok, pts, max, ...}]} döner; bulgular `findings`a eklenir.
export function scoreGeneral(meta, cv) {
  const findings = { strengths: [], weaknesses: [], risks: [] };
  const strong = (title, detail) => findings.strengths.push({ title, detail });
  const weak = (title, detail, action, lost) => findings.weaknesses.push({ title, detail, action, priority: lost });
  const risk = (level, title, detail) => findings.risks.push({ level, title, detail });

  const parts = [];
  const part = (id, label, max, notes = []) => {
    const p = { id, label, max, score: 0, notes };
    parts.push(p);
    return (pts, note) => { p.score += pts; if (note) p.notes.push(note); };
  };

  const chars = meta.text.length;
  const weirdRatio = (meta.text.match(/[←-⇿☀-➿-\u{1F300}-\u{1FAFF}]/gu) || []).length / Math.max(chars, 1);

  // 1) Biçim ve okunabilirlik — 20
  {
    const add = part('format', 'Biçim ve Okunabilirlik', 20);
    if (chars >= 500) { add(8, 'Metin sorunsuz okunabiliyor.'); }
    else if (chars >= 200) { add(3, 'Çıkarılan metin çok kısa.'); risk('high', 'Metin zor okunuyor', 'CV\'den çok az metin çıkarılabildi; dosya taranmış/görsel tabanlı olabilir.'); }
    else risk('high', 'CV metni okunamıyor', 'Dosyada okunabilir metin bulunamadı. Taranmış veya resim tabanlı PDF\'ler ATS tarafından boş görünür; metin seçilebilir bir PDF/DOCX yükleyin.');
    if (meta.pages <= 2) { add(5, `${meta.pagesEstimated ? '~' : ''}${meta.pages} sayfa: ideal uzunluk.`); strong('Uygun uzunluk', `CV ${meta.pagesEstimated ? 'yaklaşık ' : ''}${meta.pages} sayfa; ATS ve işe alımcılar için ideal.`); }
    else if (meta.pages === 3) { add(2); weak('CV 3 sayfa', 'Uzun CV\'ler önemli bilgileri gömer.', 'CV\'nizi en fazla 2 sayfaya indirin.', 3); }
    else { weak(`CV ${meta.pages} sayfa`, 'Çok uzun CV\'ler okunmadan elenir.', 'CV\'nizi en fazla 2 sayfaya indirin.', 5); }
    if (meta.tables === 0 && meta.images === 0) add(4);
    else {
      add(1);
      risk('medium', 'Tablo veya görsel kullanımı', `Dosyada ${meta.tables} tablo ve ${meta.images} görsel var; bazı ATS'ler tablo içindeki metni yanlış sırayla okur veya hiç okumaz. Düz metin akışı kullanın.`);
      weak('Tablo/görsel kullanımı', 'Tablolar ve resimler ayrıştırmayı bozabilir.', 'Tablo ve görselleri kaldırıp düz metin düzenine geçin.', 3);
    }
    if (weirdRatio < 0.01) add(3);
    else {
      risk('low', 'Özel simge/emoji kullanımı', 'Simge ve emojiler ATS\'te anlamsız karakterlere dönüşebilir. Standart madde işareti (•) kullanın.');
      weak('Özel simgeler', 'Emoji/ikon karakterleri okunamayabilir.', 'Simge ve emojileri standart madde işaretleriyle değiştirin.', 2);
    }
  }

  // 2) İletişim — 10
  {
    const add = part('contact', 'İletişim Bilgileri', 10);
    if (cv.email) add(4); else { risk('high', 'E-posta bulunamadı', 'ATS aday kaydı için e-posta arar; eksikse başvuru işlenemeyebilir.'); weak('E-posta eksik', 'İşe alımcı size ulaşamaz.', 'E-posta adresinizi CV\'nin en üstüne ekleyin.', 4); }
    if (cv.phone) add(4); else { risk('medium', 'Telefon bulunamadı', 'Telefon numarası okunamadı.'); weak('Telefon eksik', 'Telefon numarası bulunamadı.', 'Telefon numaranızı +90 5XX XXX XX XX biçiminde yazın.', 4); }
    if (cv.linkedin) { add(2); strong('LinkedIn bağlantısı', 'Profil bağlantısı CV\'de yer alıyor.'); }
    else weak('LinkedIn bağlantısı yok', 'Birçok işe alımcı önce LinkedIn profilini kontrol eder.', 'LinkedIn profil adresinizi ekleyin.', 2);
    if (cv.email && cv.phone) strong('Eksiksiz iletişim bilgisi', 'E-posta ve telefon net biçimde okunabiliyor.');
  }

  // 3) Bölüm yapısı — 15
  {
    const add = part('structure', 'Bölüm Yapısı', 15);
    const s = cv.sections;
    const check = (ok, pts, okTitle, missTitle, missDetail, action, lost) => {
      if (ok) { add(pts); if (okTitle) strong(okTitle, 'Standart başlıkla tanımlanmış; ATS doğru bölüme yerleştirir.'); }
      else { weak(missTitle, missDetail, action, lost); }
    };
    check(s.experience, 5, 'İş deneyimi bölümü', 'İş deneyimi başlığı bulunamadı', 'ATS deneyimi "İş Deneyimi" gibi standart bir başlıktan tanır.', '"İş Deneyimi" başlığı altında deneyimlerinizi listeleyin.', 5);
    check(s.education, 4, 'Eğitim bölümü', 'Eğitim başlığı bulunamadı', 'Eğitim bilgisi standart başlıkla verilmemiş.', '"Eğitim" başlığı altında okul, bölüm ve yıl bilgisini yazın.', 4);
    check(s.skills, 3, 'Yetenekler bölümü', 'Yetenekler/Beceriler bölümü yok', 'Anahtar kelime eşleşmesi için ayrı bir beceri listesi güçlü bir sinyaldir.', '"Yetenekler" başlığıyla araç ve yetkinlikleri listeleyin.', 3);
    check(s.summary, 3, null, 'Profesyonel özet yok', 'Özet bölümü ATS ve işe alımcının ilk okuduğu yerdir.', 'Profesyonel özet bölümünü daha etkili hazırlayın.', 3);
    if (!s.experience) risk('high', 'Deneyim bölümü tanınmıyor', 'Standart olmayan başlıklar (ör. "Yolculuğum") ATS\'in bölümü atlamasına yol açar.');
  }

  // 4) Deneyim içeriği — 25
  {
    const add = part('experience', 'Deneyim İçeriği', 25);
    const e = cv.expLines;
    if (cv.experience.ranges >= 2) { add(6); strong('Tarihli deneyim kayıtları', `${cv.experience.ranges} tarih aralığı okunabildi (≈${cv.experience.years} yıl).`); }
    else if (cv.experience.ranges === 1) { add(3); weak('Tek tarih aralığı', 'Yalnızca bir iş tarihi okunabildi.', 'Her iş için "AA/YYYY - AA/YYYY" biçiminde tarih yazın.', 3); }
    else { weak('Tarih aralığı okunamadı', 'ATS deneyim süresini hesaplayamaz.', 'Her iş için "AA/YYYY - AA/YYYY" biçiminde tarih yazın.', 6); risk('high', 'Deneyim süresi hesaplanamıyor', 'Tarih aralıkları okunamadığı için toplam deneyim 0 görünebilir.'); }
    if (cv.experience.formatMix) { weak('Karışık tarih biçimi', 'Aynı CV\'de farklı tarih biçimleri kullanılmış.', 'Tüm tarihlerde aynı biçimi (AA/YYYY) kullanın.', 1); risk('low', 'Tutarsız tarih biçimi', 'Farklı tarih biçimleri ayrıştırma hatasına yol açabilir.'); }
    if (e.count >= 4) add(5); else if (e.count >= 1) { add(2); weak('Az sayıda başarı maddesi', 'Deneyim altında az açıklama var.', 'Her iş için 3-5 maddelik sonuç odaklı açıklama yazın.', 3); } else weak('Deneyim açıklaması yok', 'İş unvanı dışında içerik bulunamadı.', 'Her iş için 3-5 maddelik sonuç odaklı açıklama yazın.', 5);
    const ar = e.count ? e.action / e.count : 0;
    if (ar >= 0.4) { add(5); strong('Eylem odaklı anlatım', 'Maddelerin çoğu eylem fiilleriyle başlıyor.'); } else if (ar >= 0.2) add(3); else { add(e.count ? 1 : 0); if (e.count) weak('Zayıf eylem fiilleri', 'Maddeler görev tanımı gibi okunuyor.', 'Maddeleri "Yönettim, geliştirdim, azalttım" gibi eylem fiilleriyle başlatın.', 3); }
    if (e.quant >= 4) { add(9); strong('Ölçülebilir başarılar', `${e.quant} maddede rakam/yüzde ile somut sonuç var.`); }
    else if (e.quant >= 2) { add(6); weak('Sayısal başarı az', `Yalnızca ${e.quant} maddede rakam var.`, 'Deneyimlerinizi somut başarılarla güçlendirin.', 3); }
    else if (e.quant === 1) { add(3); weak('Sayısal başarı çok az', 'Tek bir maddede rakam var.', 'Deneyimlerinizi somut başarılarla güçlendirin.', 6); }
    else weak('Ölçülebilir başarı yok', 'Hiçbir maddede rakam, yüzde veya tutar yok.', 'Deneyimlerinizi somut başarılarla güçlendirin.', 9);
    if (e.weak >= 2) weak('"Sorumluydum" ağırlıklı dil', `${e.weak} maddede "sorumlu" kalıbı var.`, '"Sorumluydum" yerine sonuçları anlatan fiiller kullanın.', 1);
  }

  // 5) Eğitim ve ek bilgiler — 10
  {
    const add = part('extras', 'Eğitim ve Ek Bilgiler', 10);
    if (cv.education) { add(4); strong('Eğitim seviyesi net', `${cv.education} düzeyi okunabiliyor.`); } else weak('Eğitim seviyesi okunamadı', 'Derece (Lisans, Yüksek Lisans...) belirtilmemiş.', 'Eğitim satırında derece, bölüm ve mezuniyet yılını yazın.', 4);
    if (cv.languages.length) { add(2); strong('Yabancı dil belirtilmiş', cv.languages.map((l) => l.name + (l.level ? ` (${l.level})` : '')).join(', ')); } else weak('Yabancı dil belirtilmemiş', 'Dil bilgisi birçok ilanda filtre kriteridir.', 'Yabancı dil ve seviyenizi (ör. İngilizce - C1) ekleyin.', 2);
    if (cv.certificates) { add(2); strong('Sertifikalar', `${cv.certificates} sertifika listelenmiş.`); }
    if (cv.courses) { add(2); strong('Kurs ve eğitimler', `${cv.courses} kurs/eğitim listelenmiş.`); }
    if (!cv.certificates && !cv.courses) weak('Sertifika/kurs yok', 'Güncel sertifikalar teknik yetkinliği doğrular.', 'Mesleğinizle ilgili sertifika ve kursları ekleyin.', 2);
  }

  // 6) Uzunluk ve özet — 10
  {
    const add = part('length', 'İçerik Hacmi ve Özet', 10);
    const w = meta.wordCount;
    if (w >= 300 && w <= 900) add(6); else if ((w >= 150 && w < 300) || (w > 900 && w <= 1200)) { add(3); weak(w < 300 ? 'İçerik kısa' : 'İçerik uzun', `CV ${w} kelime.`, w < 300 ? 'Deneyim ve becerilerinizi daha ayrıntılı yazın (hedef 400-700 kelime).' : 'Gereksiz ayrıntıları çıkarın (hedef 400-700 kelime).', 3); } else weak(w < 150 ? 'İçerik çok kısa' : 'İçerik çok uzun', `CV ${w} kelime.`, w < 150 ? 'CV\'ye deneyim ve beceri ayrıntıları ekleyin.' : 'CV\'yi kısaltın.', 6);
    const sw = cv.summaryWords;
    if (sw >= 25 && sw <= 100) { add(4); strong('Etkili özet uzunluğu', `Özet ${sw} kelime.`); } else if (sw > 0) { add(2); weak(sw < 25 ? 'Özet çok kısa' : 'Özet çok uzun', `Özet ${sw} kelime.`, 'Profesyonel özet bölümünü 3-4 cümleyle (40-80 kelime) daha etkili hazırlayın.', 2); }
  }

  // 7) Beceriler — 10
  {
    const add = part('skills', 'Beceri Listesi', 10);
    const n = cv.skills.count;
    add(n >= 8 ? 10 : n >= 5 ? 7 : n >= 3 ? 4 : n >= 1 ? 2 : 0);
    if (n >= 8) strong('Zengin beceri listesi', `${n} beceri/araç listelenmiş.`);
    else if (cv.sections.skills) weak('Beceri listesi kısa', `Yalnızca ${n} beceri bulundu.`, 'En az 8-10 araç ve yetkinliği virgülle ayırarak listeleyin.', 10 - (n >= 5 ? 7 : n >= 3 ? 4 : 2));
  }

  const score = clamp(Math.round(parts.reduce((s, p) => s + p.score, 0)), 0, 100);
  return { score, status: status(score), breakdown: parts, findings };
}
