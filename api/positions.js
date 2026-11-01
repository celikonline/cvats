import { POSITIONS } from '../src/positions.js';

export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json(POSITIONS.map((p) => p.name));
}
