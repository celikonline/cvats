# ATS Pro – CV ATS Test Raporu

CV yükleyin (PDF / DOCX / TXT), hedef pozisyonu girin; ATS uyumunu, 100 üzerinden puanları, eksik anahtar kelimeleri ve elenme risklerini görsel skor kartı + detaylı raporla alın. Rapor tarayıcıdan PDF olarak kaydedilebilir.

```bash
npm install
npm start      # http://localhost:3000
npm test
```

## Rapor içeriği
ATS uyum analizi · genel ATS puanı · hedef + ilişkili pozisyon puanları (GEÇTİ ≥ 75, SINIRDA 60–74, ELENDİ < 60) · güçlü yönler · en az 5 eksik/zayıf nokta · anahtar kelime analizi · ATS elenme riskleri · gelişim önerileri · görsel skor kartı.

## Nasıl çalışır
`src/extract.js` metni çıkarır → `src/parse.js` bölümleri, iletişim bilgisini, deneyim süresini (çakışmalar tekrar sayılmaz), eğitim/dil/sertifika/kursları bulur → `src/score.js` genel puanı 7 bileşenden hesaplar (biçim 20, iletişim 10, yapı 15, deneyim 25, eğitim/ek 10, hacim+özet 10, beceri 10) → `src/analyze.js` pozisyon puanını hesaplar (anahtar kelime 55 + unvan 15 + deneyim/eğitim 15 + genel kalite 15) ve raporu birleştirir.

- Pozisyon profilleri `src/positions.js` içindedir (muhasebe, finans, yazılım, veri, İK, satış, proje). Yeni pozisyon eklemek için bir kayıt eklemek yeterlidir.
- İş ilanı yapıştırılırsa ilandaki sık kelimeler hedef puana katılır.
- Dosyalar yalnızca bellekte işlenir, saklanmaz.

## Sınırlar
Kural tabanlı bir tahmindir; belirli bir firmanın ATS yazılımının gerçek puanı değildir. Taranmış (resim) PDF'lerden metin çıkarılamaz (OCR yok); bu durum yüksek risk olarak raporlanır. `.doc` desteklenmez. PDF'te tablo/görsel tespiti yapılmaz (yalnız DOCX'te).
