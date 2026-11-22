import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();
const CLAVE = 'ClaveSegura123';
const mail = () => `u${Math.random().toString(36).slice(2)}@ejemplo.com`;

async function client() {
  const agent = request.agent(app);
  const { body } = await agent.get('/api/auth/csrf');
  return { agent, csrf: body.csrfToken };
}

async function registrar(email = mail(), password = CLAVE) {
  const { agent, csrf } = await client();
  const res = await agent
    .post('/api/auth/register')
    .set('x-csrf-token', csrf)
    .send({ email, displayName: 'Prueba', password });
  return { agent, res, email, csrf: res.body.csrfToken };
}

describe('CSRF', () => {
  it('rechaza un POST sin token CSRF', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: mail(), password: 'x' });
    expect(res.status).toBe(403);
  });
});

describe('registro', () => {
  it('crea un visitante y nunca devuelve el hash', async () => {
    const { res } = await registrar();
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('visitante');
    expect(JSON.stringify(res.body)).not.toMatch(/hash|argon/i);
  });

  it('rechaza contraseñas débiles', async () => {
    const { agent, csrf } = await client();
    for (const password of ['corta1', 'sololetrasaquinada']) {
      const res = await agent
        .post('/api/auth/register')
        .set('x-csrf-token', csrf)
        .send({ email: mail(), displayName: 'Prueba', password });
      expect(res.status).toBe(400);
    }
  });

  it('rechaza correos duplicados', async () => {
    const { email } = await registrar();
    const { res } = await registrar(email);
    expect(res.status).toBe(409);
  });

  it('el correo ADMIN_EMAIL queda como admin y entra a rutas de admin', async () => {
    const { agent, res } = await registrar('admin@liquidpi.test');
    expect(res.body.user.role).toBe('admin');
    const ping = await agent.get('/api/admin/ping');
    expect(ping.status).toBe(200);
  });

  it('un visitante normal NO entra a rutas de admin', async () => {
    const { agent } = await registrar();
    const ping = await agent.get('/api/admin/ping');
    expect(ping.status).toBe(403);
  });

  it('la cookie de sesión es httpOnly', async () => {
    const { res } = await registrar();
    expect(res.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);
  });
});

describe('sesión', () => {
  it('login correcto, /me funciona y tras logout ya no', async () => {
    const { email } = await registrar();
    const { agent, csrf } = await client();

    const login = await agent.post('/api/auth/login').set('x-csrf-token', csrf)
      .send({ email, password: CLAVE });
    expect(login.status).toBe(200);

    expect((await agent.get('/api/auth/me')).status).toBe(200);

    await agent.post('/api/auth/logout').set('x-csrf-token', login.body.csrfToken);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});

describe('ataques', () => {
  it('mismo mensaje si el correo no existe o la contraseña falla', async () => {
    const { email } = await registrar();
    const { agent, csrf } = await client();

    const a = await agent.post('/api/auth/login').set('x-csrf-token', csrf)
      .send({ email, password: 'ContraseñaEquivocada1' });
    const b = await agent.post('/api/auth/login').set('x-csrf-token', csrf)
      .send({ email: mail(), password: 'ContraseñaEquivocada1' });

    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toBe(b.body.error);
  });

  it('inyección SQL en el login no funciona', async () => {
    const { agent, csrf } = await client();
    const r1 = await agent.post('/api/auth/login').set('x-csrf-token', csrf)
      .send({ email: "admin' OR '1'='1", password: 'x' });
    expect(r1.status).toBe(400);

    const r2 = await agent.post('/api/auth/login').set('x-csrf-token', csrf)
      .send({ email: 'admin@liquidpi.test', password: "' OR 1=1 --" });
    expect(r2.status).toBe(401);
  });

  // Dejar este test de último: llena el límite de intentos
  it('bloquea la fuerza bruta con 429', async () => {
    const { agent, csrf } = await client();
    const estados = [];
    for (let i = 0; i < 15; i++) {
      const r = await agent.post('/api/auth/login').set('x-csrf-token', csrf)
        .send({ email: 'victima@ejemplo.com', password: `intento${i}abc` });
      estados.push(r.status);
    }
    expect(estados).toContain(429);
  });
});