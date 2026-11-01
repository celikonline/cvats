// Türkçe/İngilizce metin eşleştirme yardımcıları.
// Tüm karşılaştırmalar "fold" edilmiş (küçük harf, aksansız) metin üzerinde yapılır.

export function fold(s = '') {
  return String(s)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[‒-―−]/g, '-')
    .replace(/[  -​]/g, ' ');
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cache = new Map();

// Anahtar kelime başlangıcı kelime sınırında olmalı (Türkçe ekleri tolere etmek için
// sonu serbest); 3 harf ve altı kısaltmalar (sap, sql, erp) iki yandan sınırlıdır.
function altRegex(alt) {
  let re = cache.get(alt);
  if (!re) {
    const body = escapeRe(alt).replace(/\s+/g, '\\s+');
    re = new RegExp(`(?<![a-z0-9])${body}${alt.length <= 3 ? '(?![a-z0-9])' : ''}`);
    cache.set(alt, re);
  }
  return re;
}

// spec: "kdv|katma değer vergisi" gibi, fold edilmiş alternatifler. İlk eşleşeni döner.
export function matchKeyword(foldedText, spec) {
  for (const alt of spec.split('|')) {
    if (altRegex(alt).test(foldedText)) return alt;
  }
  return null;
}

// İş ilanından çıkan serbest kelimeler için kök eşleştirme ("yönetimi" ~ "yönetim").
export function stemMatch(foldedText, token) {
  const n = token.length;
  const stem = n >= 7 ? token.slice(0, n - 2) : n >= 5 ? token.slice(0, n - 1) : token;
  const re = new RegExp(`(?<![a-z0-9])${escapeRe(stem)}${n < 5 ? '(?![a-z0-9])' : ''}`);
  return re.test(foldedText);
}

export const words = (s) => (s.match(/[\p{L}\p{N}]+/gu) || []).length;
