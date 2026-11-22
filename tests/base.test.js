import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('base y seguridad', () => {
  it('responde al health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('no revela que usa Express y trae cabeceras de helmet', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rutas inexistentes dan 404 en JSON', async () => {
    const res = await request(app).get('/api/nada');
    expect(res.status).toBe(404);
  });

  it('un visitante sin sesión no entra a rutas de admin', async () => {
    const res = await request(app).get('/api/admin/ping');
    expect(res.status).toBe(401);
  });
});