import { analyzeHandler } from '../src/handler.js';

// multer gövdeyi kendisi okur; Vercel'in gövde ayrıştırıcısı kapatılmalı.
export const config = { api: { bodyParser: false } };

export default analyzeHandler;
