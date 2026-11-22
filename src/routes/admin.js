import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { db } from '../config/database.js';
import { uploadDir, MAX_BYTES } from '../config/uploads.js';
import { requireRole } from '../middleware/auth.js';
import { wrap, invalid } from '../utils/http.js';
import { appCreateSchema, appUpdateSchema } from '../validators/apps.js';
import {
  isAllowedName, cleanOriginalName, readHeader, hasValidMagic, sha256File, removeFile,
} from '../services/files.js';

const router = Router();

router.get('/ping', requireRole('admin'), (_req, res) => res.json({ ok: true }));

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, _file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}.bin`),
  }),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 5 },
  fileFilter: (_req, file, cb) => cb(null, isAllowedName(file.originalname)),
});

function receiveFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'El archivo es demasiado grande' });
    return res.status(400).json({ error: 'No se pudo recibir el archivo' });
  });
}

const slugExists = db.prepare('SELECT 1 FROM apps WHERE slug = ?');
const insertApp = db.prepare(`
  INSERT INTO apps (name, slug, description, version, stored_name, original_name, size_bytes, sha256, uploaded_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const getById = db.prepare('SELECT * FROM apps WHERE id = ?');
const updateApp = db.prepare(`
  UPDATE apps SET name = COALESCE(?, name), description = COALESCE(?, description),
  version = COALESCE(?, version) WHERE id = ?
`);
const deleteApp = db.prepare('DELETE FROM apps WHERE id = ?');

function slugify(text) {
  return String(text)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'app';
}

function uniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; slugExists.get(slug); i++) slug = `${base}-${i}`;
  return slug;
}

const toAdmin = (a) => ({
  id: a.id, name: a.name, slug: a.slug, description: a.description, version: a.version,
  sizeBytes: a.size_bytes, sha256: a.sha256, downloads: a.downloads, createdAt: a.created_at,
});

router.post('/apps', requireRole('admin'), receiveFile, wrap(async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Falta el archivo o su tipo no está permitido' });
  }

  let saved = false;
  try {
    const parsed = appCreateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(res, parsed.error);

    const header = await readHeader(file.path);
    if (!hasValidMagic(file.originalname, header)) {
      return res.status(400).json({ error: 'El contenido del archivo no coincide con su tipo' });
    }

    const sha256 = await sha256File(file.path);
    const { name, description, version } = parsed.data;
    const slug = uniqueSlug(name);

    const info = insertApp.run(
      name, slug, description, version,
      path.basename(file.path), cleanOriginalName(file.originalname),
      file.size, sha256, req.user.id,
    );
    saved = true;
    res.status(201).json({ app: toAdmin(getById.get(info.lastInsertRowid)) });
  } finally {
    if (!saved) await removeFile(file.path);
  }
}));

router.patch('/apps/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'App no encontrada' });
  if (!getById.get(id)) return res.status(404).json({ error: 'App no encontrada' });

  const parsed = appUpdateSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);

  const { name, description, version } = parsed.data;
  updateApp.run(name ?? null, description ?? null, version ?? null, id);
  res.json({ app: toAdmin(getById.get(id)) });
});

router.delete('/apps/:id', requireRole('admin'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const app = Number.isInteger(id) ? getById.get(id) : null;
  if (!app) return res.status(404).json({ error: 'App no encontrada' });

  deleteApp.run(id);
  await removeFile(path.join(uploadDir, app.stored_name));
  res.json({ ok: true });
}));

export default router;