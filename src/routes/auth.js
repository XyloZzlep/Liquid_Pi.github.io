import { Router } from 'express';
import argon2 from 'argon2';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { registerSchema, loginSchema } from '../validators/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/limiters.js';
import { csrfToken, newCsrfToken } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const DUMMY_HASH = await argon2.hash('contrasena-que-nadie-usa');

const findByEmail = db.prepare(
  'SELECT id, email, display_name, role, password_hash FROM users WHERE email = ?'
);
const insertUser = db.prepare(
  'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
);
const adminExists = db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const regenerate = (req) =>
  new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
const destroy = (req) =>
  new Promise((resolve, reject) => req.session.destroy((e) => (e ? reject(e) : resolve())));

export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  displayName: u.display_name,
  role: u.role,
});

function invalid(res, zodError) {
  return res.status(400).json({
    error: 'Datos inválidos',
    details: zodError.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
  });
}

export async function startSession(req, userId) {
  await regenerate(req);
  req.session.userId = userId;
  req.session.csrf = newCsrfToken();
  return req.session.csrf;
}

router.get('/csrf', csrfToken);

router.post('/register', registerLimiter, wrap(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const { email, password, displayName } = parsed.data;

  const taken = { error: 'No se pudo crear la cuenta con esos datos' };
  if (findByEmail.get(email)) return res.status(409).json(taken);

  const hash = await argon2.hash(password);

  const isFirstAdmin =
    env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.toLowerCase() && !adminExists.get();
  const role = isFirstAdmin ? 'admin' : 'visitante';

  let id;
  try {
    id = Number(insertUser.run(email, hash, displayName, role).lastInsertRowid);
  } catch (e) {
    if (String(e.code).startsWith('SQLITE_CONSTRAINT')) return res.status(409).json(taken);
    throw e;
  }

  const csrf = await startSession(req, id);
  res.status(201).json({ user: { id, email, displayName, role }, csrfToken: csrf });
}));

router.post('/login', loginLimiter, wrap(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const { email, password } = parsed.data;

  const user = findByEmail.get(email);
  const ok = await argon2
    .verify(user?.password_hash ?? DUMMY_HASH, password)
    .catch(() => false);

  if (!user || !user.password_hash || !ok) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }

  const csrf = await startSession(req, user.id);
  res.json({ user: publicUser(user), csrfToken: csrf });
}));

router.post('/logout', wrap(async (req, res) => {
  await destroy(req);
  res.clearCookie('lp.sid');
  res.json({ ok: true });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
