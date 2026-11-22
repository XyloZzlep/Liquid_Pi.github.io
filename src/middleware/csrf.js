import crypto from 'node:crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function newCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function csrfToken(req, res) {
  if (!req.session.csrf) req.session.csrf = newCsrfToken();
  res.json({ csrfToken: req.session.csrf });
}

export function csrfProtect(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const sent = req.get('x-csrf-token');
  const real = req.session.csrf;
  if (!sent || !real) return res.status(403).json({ error: 'Token CSRF faltante' });

  const a = Buffer.from(sent);
  const b = Buffer.from(real);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'Token CSRF inválido' });
  }
  next();
}