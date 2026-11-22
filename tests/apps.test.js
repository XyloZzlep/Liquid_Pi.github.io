import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();
const CLAVE = 'ClaveSegura123';

// Archivo mínimo que "parece" un zip (empieza con PK\x03\x04)
const zipFalso = (extra = 'contenido de prueba') =>
  Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from(extra)]);

const binario = (res, cb) => {
  const chunks = [];
  res.on('data', (d) => chunks.push(d));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

async function sesion(email) {
  const agent = request.agent(app);
  const { body } = await agent.get('/api/auth/csrf');
  const res = await agent.post('/api/auth/register').set('x-csrf-token', body.csrfToken)
    .send({ email, displayName: 'Prueba', password: CLAVE });
  return { agent, csrf: res.body.csrfToken };
}

let admin;
let visitante;

beforeAll(async () => {
  admin = await sesion('admin@liquidpi.test');
  visitante = await sesion('visitante@ejemplo.com');
});

function subir({ agent, csrf }, { nombre = 'Lanzador Scratch', version = '1.0.0', archivo = zipFalso(), filename = 'app.zip' } = {}) {
  return agent.post('/api/admin/apps').set('x-csrf-token', csrf)
    .field('name', nombre).field('description', 'Descripción').field('version', version)
    .attach('file', archivo, filename);
}

describe('permisos de subida', () => {
  it('sin sesión: 401', async () => {
    const agent = request.agent(app);
    const { body } = await agent.get('/api/auth/csrf');
    const res = await subir({ agent, csrf: body.csrfToken });
    expect(res.status).toBe(401);
  });

  it('un visitante NO puede subir apps: 403', async () => {
    const res = await subir(visitante);
    expect(res.status).toBe(403);
  });
});

describe('validación de archivos', () => {
  it('el admin sube un zip válido y el hash coincide', async () => {
    const res = await subir(admin);
    expect(res.status).toBe(201);
    expect(res.body.app.slug).toBe('lanzador-scratch');
    expect(res.body.app.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(res.body)).not.toMatch(/stored|\.bin/i);
  });

  it('rechaza extensiones no permitidas (.exe)', async () => {
    const res = await subir(admin, { archivo: zipFalso(), filename: 'virus.exe' });
    expect(res.status).toBe(400);
  });

  it('rechaza un archivo que finge ser zip', async () => {
    const res = await subir(admin, { archivo: Buffer.from('esto es solo texto'), filename: 'falso.zip' });
    expect(res.status).toBe(400);
  });

  it('rechaza versiones con formato raro', async () => {
    const res = await subir(admin, { version: '1.0; DROP TABLE apps' });
    expect(res.status).toBe(400);
  });

  it('no deja que el nombre del archivo escape de la carpeta', async () => {
    const res = await subir(admin, { nombre: 'Ruta Maliciosa', filename: '../../evil.zip' });
    expect(res.status).toBe(201);
    const dl = await request(app).get('/api/apps/ruta-maliciosa/download').buffer(true).parse(binario);
    expect(dl.status).toBe(200);
    expect(dl.headers['content-disposition']).not.toContain('..');
  });
});

describe('listado y descarga públicos', () => {
  it('cualquier visitante ve el listado sin iniciar sesión', async () => {
    await subir(admin, { nombre: 'App Publica' });
    const res = await request(app).get('/api/apps');
    expect(res.status).toBe(200);
    expect(res.body.apps.some((a) => a.slug === 'app-publica')).toBe(true);
  });

  it('descarga el mismo contenido y cuenta la descarga', async () => {
    const contenido = zipFalso('contenido exacto 123');
    await subir(admin, { nombre: 'App Descarga', archivo: contenido });

    const dl = await request(app).get('/api/apps/app-descarga/download').buffer(true).parse(binario);
    expect(dl.status).toBe(200);
    expect(Buffer.compare(dl.body, contenido)).toBe(0);
    expect(dl.headers['content-disposition']).toMatch(/attachment/);

    const info = await request(app).get('/api/apps/app-descarga');
    expect(info.body.app.downloads).toBe(1);
  });

  it('slug inexistente o con caracteres raros: 404', async () => {
    expect((await request(app).get('/api/apps/no-existe/download')).status).toBe(404);
    expect((await request(app).get('/api/apps/..%2F..%2F.env/download')).status).toBe(404);
  });
});

describe('editar y borrar', () => {
  it('un visitante no puede borrar', async () => {
    const { body } = await subir(admin, { nombre: 'Para Borrar 1' });
    const res = await visitante.agent.delete(`/api/admin/apps/${body.app.id}`).set('x-csrf-token', visitante.csrf);
    expect(res.status).toBe(403);
  });

  it('el admin edita y borra; luego la descarga da 404', async () => {
    const { body } = await subir(admin, { nombre: 'Para Borrar 2' });
    const id = body.app.id;

    const edit = await admin.agent.patch(`/api/admin/apps/${id}`).set('x-csrf-token', admin.csrf)
      .send({ version: '2.0.0' });
    expect(edit.status).toBe(200);
    expect(edit.body.app.version).toBe('2.0.0');

    const del = await admin.agent.delete(`/api/admin/apps/${id}`).set('x-csrf-token', admin.csrf);
    expect(del.status).toBe(200);
    expect((await request(app).get('/api/apps/para-borrar-2/download')).status).toBe(404);
  });
});