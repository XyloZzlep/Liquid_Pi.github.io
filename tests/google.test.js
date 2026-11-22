import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('login con Google', () => {
  it('redirige a Google con state y nonce', async () => {
    const res = await request(app).get('/api/auth/google');
    expect(res.status).toBe(302);
    const url = new URL(res.headers.location);
    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('state')).toHaveLength(48);
    expect(url.searchParams.get('nonce')).toHaveLength(48);
    expect(url.searchParams.get('scope')).toContain('email');
  });

  it('rechaza el callback con un state falso', async () => {
    const agent = request.agent(app);
    await agent.get('/api/auth/google');
    const res = await agent.get('/api/auth/google/callback?code=abc&state=falso');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/?login=error');
  });

  it('rechaza el callback si nunca se inició el flujo', async () => {
    const res = await request(app).get('/api/auth/google/callback?code=abc&state=xyz');
    expect(res.headers.location).toBe('/?login=error');
  });
});