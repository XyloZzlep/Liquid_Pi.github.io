import { db } from '../config/database.js';

const getUser = db.prepare(
  'SELECT id, email, display_name, role FROM users WHERE id = ?'
);

export function loadUser(req, _res, next) {
  req.user = req.session.userId ? getUser.get(req.session.userId) ?? null : null;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }
    next();
  };
}