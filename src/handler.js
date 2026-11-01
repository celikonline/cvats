// Hem yerel Express sunucusunda hem Vercel serverless fonksiyonunda kullanılan ortak işleyici.
import multer from 'multer';
import { extractText, CvFormatError } from './extract.js';
import { analyze } from './analyze.js';

// Vercel fonksiyon gövdesi en çok 4,5 MB olduğundan sınır 4 MB.
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
// Dosyalar yalnızca bellekte işlenir; diske yazılmaz ve saklanmaz.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } }).single('cv');

const parseUpload = (req, res) => new Promise((resolve, reject) => upload(req, res, (e) => (e ? reject(e) : resolve())));

export async function analyzeHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST desteklenir.' });
  try {
    await parseUpload(req, res);
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Dosya 4 MB sınırını aşıyor.' : 'Dosya yüklenemedi.' });
    }
    console.error(err);
    return res.status(400).json({ error: 'İstek okunamadı.' });
  }
  if (!req.file) return res.status(400).json({ error: 'Lütfen bir CV dosyası yükleyin.' });

  try {
    // multer dosya adını latin1 okur; UTF-8'e çevir.
    const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const meta = await extractText(req.file.buffer, fileName);
    const result = analyze({
      text: meta.text,
      meta: { ...meta, fileName },
      target: String(req.body?.position || '').slice(0, 120),
      jobDescription: String(req.body?.jobDescription || '').slice(0, 8000),
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof CvFormatError) return res.status(415).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'CV okunamadı. Dosya bozuk veya şifreli olabilir.' });
  }
}
