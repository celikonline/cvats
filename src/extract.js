import path from 'node:path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export class CvFormatError extends Error {}

const WORDS_PER_PAGE = 500;

function clean(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractText(buffer, filename = '') {
  const ext = path.extname(filename).toLowerCase();
  const isPdf = ext === '.pdf' || buffer.subarray(0, 5).toString() === '%PDF-';

  if (isPdf) {
    const r = await pdfParse(buffer);
    return { text: clean(r.text), pages: r.numpages, pagesEstimated: false, format: 'pdf', tables: 0, images: 0 };
  }

  if (ext === '.docx') {
    const [raw, html] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }),
    ]);
    const text = clean(raw.value);
    return {
      text,
      pages: Math.max(1, Math.ceil(text.split(/\s+/).length / WORDS_PER_PAGE)),
      pagesEstimated: true,
      format: 'docx',
      tables: (html.value.match(/<table/g) || []).length,
      images: (html.value.match(/<img/g) || []).length,
    };
  }

  if (ext === '.txt' || ext === '.md') {
    const text = clean(buffer.toString('utf8'));
    return {
      text,
      pages: Math.max(1, Math.ceil(text.split(/\s+/).length / WORDS_PER_PAGE)),
      pagesEstimated: true,
      format: 'txt',
      tables: 0,
      images: 0,
    };
  }

  if (ext === '.doc') {
    throw new CvFormatError('Eski .doc biçimi desteklenmiyor. Lütfen CV\'nizi .docx veya PDF olarak kaydedin.');
  }
  throw new CvFormatError('Desteklenen biçimler: PDF, DOCX, TXT.');
}
