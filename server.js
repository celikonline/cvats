// Yerel geliştirme sunucusu. Vercel'de bu dosya kullanılmaz; api/ klasörü çalışır.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { analyzeHandler } from './src/handler.js';
import { POSITIONS } from './src/positions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/positions', (_req, res) => res.json(POSITIONS.map((p) => p.name)));
app.post('/api/analyze', analyzeHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ATS Pro çalışıyor: http://localhost:${port}`));
