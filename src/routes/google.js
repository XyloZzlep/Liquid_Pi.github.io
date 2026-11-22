import { Router } from 'express';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { newCsrfToken } from '../middleware/csrf.js';

const router = Router();

const enabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
const client = enabled
  ? new OAuth2Client({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    })
  : null;

const findByGoogle = db.prepare(
  "SELECT user_id FROM oauth_accounts WHERE provider = 'google' AND provider_id = ?"
);
const findByEmail = db.prepare('SELECT id, password_hash FROM users WHERE email = ?');
const insertUser = db.prepare(
  'INSERT INTO users (email, display_name, role) VALUES (?, ?, ?)'
);
const insertOauth = db.prepare(
  "INSERT INTO oauth_accounts (user_id, provider, provider_id) VALUES (?, 'google', ?)"
);
const clearPassword = db.prepare('UPDATE users SET password_hash = NULL WHERE id = ?');
const adminExists = db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");

const safeEqual = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const regenerate = (req) =>
  new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));

const resolveUser = db.transaction((p) => {
  const linked = findByGoogle.get(p.sub);
  if (linked) return linked.user_id;

  const email = p.email.toLowerCase();
  const existing = findByEmail.get(email);
  let id;

  if (existing) {
    id = existing.id;
    if (existing.password_hash) clearPassword.run(id);
  } else {
    const displayName =
      String(p.name || email.split('@')[0]).replace(/\s+/g, ' ').trim().slice(0, 50) || 'Usuario';
    const isFirstAdmin =
      env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.toLowerCase() && !adminExists.get();
    id = Number(insertUser.run(email, displayName, isFirstAdmin ? 'admin' : 'visitante').lastInsertRowid);
  }

  insertOauth.run(id, p.sub);
  return id;
});

router.get('/', (req, res) => {
  if (!enabled) return res.redirect('/?login=unavailable');

  const state = crypto.randomBytes(24).toString('hex');
  const nonce = crypto.randomBytes(24).toString('hex');
  req.session.googleState = state;
  req.session.googleNonce = nonce;

  const url = client.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state,
    nonce,
    prompt: 'select_account',
  });
  req.session.save(() => res.redirect(url));
});

router.get('/callback', async (req, res) => {
  const expectedState = req.session.googleState;
  const expectedNonce = req.session.googleNonce;
  delete req.session.googleState;
  delete req.session.googleNonce;

  const { code, state, error } = req.query;
  if (
    !enabled || error ||
    typeof code !== 'string' || typeof state !== 'string' ||
    !expectedState || !expectedNonce || !safeEqual(state, expectedState)
  ) {
    return res.redirect('/?login=error');
  }

  try {
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload();

    if (!p || !p.sub || !p.email || p.email_verified !== true || p.nonce !== expectedNonce) {
      return res.redirect('/?login=error');
    }

    const userId = resolveUser(p);

    await regenerate(req);
    req.session.userId = userId;
    req.session.csrf = newCsrfToken();
    req.session.save(() => res.redirect('/?login=ok'));
  } catch (e) {
    console.error('Login con Google falló:', e.message);
    res.redirect('/?login=error');
  }
});

export default router;