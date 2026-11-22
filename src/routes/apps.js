import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { db } from '../config/database.js';
import { uploadDir } from '../config/uploads.js';
import { downloadLimiter } from '../middleware/limiters.js';
import { fullExt } from '../services/files.js';

const router = Router();

const listApps = db.prepare(`
  SELECT id, name, slug, description, version, size_bytes, sha256, downloads, created_at
  FROM apps ORDER BY created_at DESC, id DESC
`);
const getBySlug = db.prepare('SELECT * FROM apps WHERE slug = ?');
const countDownload = db.prepare('UPDATE apps SET downloads = downloads + 1 WHERE id = ?');

const toPublic = (a) => ({
  id: a.id,
  name: a.name,
  slug: a.slug,
  description: a.description,
  version: a.version,
  sizeBytes: a.size_bytes,
  sha256: a.sha256,
  downloads: a.downloads,
  createdAt: a.created_at,
});

const validSlug = (s) => /^[a-z0-9-]{1,80}$/.test(s);

router.get('/', (_req, res) => {
  res.json({ apps: listApps.all().map(toPublic) });
});

router.get('/:slug', (req, res) => {
  const app = validSlug(req.params.slug) && getBySlug.get(req.params.slug);
  if (!app) return res.status(404).json({ error: 'App no encontrada' });
  res.json({ app: toPublic(app) });
});

router.get('/:slug/download', downloadLimiter, (req, res, next) => {
  const app = validSlug(req.params.slug) && getBySlug.get(req.params.slug);
  if (!app) return res.status(404).json({ error: 'App no encontrada' });

  const filePath = path.join(uploadDir, app.stored_name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no disponible' });

  const downloadName = `${app.slug}-${app.version}${fullExt(app.original_name)}`;
  countDownload.run(app.id);
  res.download(filePath, downloadName, (err) => {
    if (err && !res.headersSent) next(err);
  });
});

export default router;