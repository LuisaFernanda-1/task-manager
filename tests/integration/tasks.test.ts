import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Config } from '../../src/config/env';
import { closePool } from '../../src/persistence/database';
import { buildTestApp, registerAndLogin, resetDatabase } from '../helpers/test-app';

const app: Express = buildTestApp();
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

afterAll(closePool);

async function createTask(token: string, body: Record<string, unknown> = { titulo: 'Tarea de prueba' }) {
  const res = await request(app).post('/tasks').set('Authorization', `Bearer ${token}`).send(body).expect(201);
  return res.body as { id: string } & Record<string, unknown>;
}

describe('Rutas protegidas de /tasks', () => {
  beforeEach(resetDatabase);

  it('responde 401 sin cabecera Authorization', async () => {
    const res = await request(app).get('/tasks').expect(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('responde 401 si el esquema no es Bearer', async () => {
    await request(app).get('/tasks').set('Authorization', 'Basic abc123').expect(401);
  });

  it('responde 401 con un token manipulado', async () => {
    const token = await registerAndLogin(app);
    await request(app).get('/tasks').set('Authorization', `Bearer ${token}x`).expect(401);
  });

  it('responde 401 con un token expirado', async () => {
    const expired = jwt.sign({ email: 'a@b.com' }, Config.getInstance().jwtSecret, {
      subject: NON_EXISTENT_ID,
      expiresIn: -1,
    });
    const res = await request(app).get('/tasks').set('Authorization', `Bearer ${expired}`).expect(401);
    expect(res.body.error.message).toMatch(/expirado/);
  });

  it('valida el token antes que el cuerpo (401 antes que 400)', async () => {
    await request(app).post('/tasks').send({}).expect(401);
  });
});

describe('CRUD de tareas', () => {
  let token: string;

  beforeEach(async () => {
    await resetDatabase();
    token = await registerAndLogin(app);
  });

  it('POST /tasks crea una tarea con estado "pendiente" por defecto', async () => {
    const task = await createTask(token, { titulo: 'Entregar prueba', fecha_vencimiento: '2026-10-23T16:00:00-05:00' });
    expect(task).toMatchObject({
      titulo: 'Entregar prueba',
      descripcion: null,
      fecha_vencimiento: '2026-10-23T21:00:00.000Z',
      estado: 'pendiente',
    });
  });

  it('POST /tasks devuelve la fecha de vencimiento en UTC', async () => {
    const task = await createTask(token, { titulo: 'Fin de año', fecha_vencimiento: '2026-12-31T23:59:59-05:00' });
    expect(task.fecha_vencimiento).toBe('2027-01-01T04:59:59.000Z');
  });

  it('POST /tasks responde 400 con estado o fecha inválidos', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'x', estado: 'terminada', fecha_vencimiento: '2026-02-30T10:00:00Z' })
      .expect(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['body.estado', 'body.fecha_vencimiento']));
  });

  it('POST /tasks rechaza un título vacío o de solo espacios', async () => {
    await request(app).post('/tasks').set('Authorization', `Bearer ${token}`).send({ titulo: '   ' }).expect(400);
  });

  it('POST /tasks ignora cualquier intento de asignar la tarea a otro usuario', async () => {
    await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'x', usuario_id: NON_EXISTENT_ID })
      .expect(400);
  });

  it('GET /tasks lista las tareas ordenadas por fecha de vencimiento', async () => {
    await createTask(token, { titulo: 'Sin fecha' });
    await createTask(token, { titulo: 'Después', fecha_vencimiento: '2026-12-01T12:00:00Z' });
    await createTask(token, { titulo: 'Antes', fecha_vencimiento: '2026-11-01T12:00:00Z' });

    const res = await request(app).get('/tasks').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.map((t: { titulo: string }) => t.titulo)).toEqual(['Antes', 'Después', 'Sin fecha']);
  });

  it('GET /tasks?estado= filtra por estado', async () => {
    await createTask(token, { titulo: 'A', estado: 'completada' });
    await createTask(token, { titulo: 'B' });

    const res = await request(app).get('/tasks?estado=completada').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].titulo).toBe('A');
  });

  it('GET /tasks/:id devuelve la tarea', async () => {
    const task = await createTask(token);
    const res = await request(app).get(`/tasks/${task.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.id).toBe(task.id);
  });

  it('GET /tasks/:id responde 400 si el id no es un UUID', async () => {
    await request(app).get('/tasks/123').set('Authorization', `Bearer ${token}`).expect(400);
  });

  it('GET /tasks/:id responde 404 si la tarea no existe', async () => {
    await request(app).get(`/tasks/${NON_EXISTENT_ID}`).set('Authorization', `Bearer ${token}`).expect(404);
  });

  it('PUT /tasks/:id reemplaza la tarea y actualiza "actualizado_en"', async () => {
    const task = await createTask(token, { titulo: 'Original', descripcion: 'desc', fecha_vencimiento: '2026-11-01T12:00:00Z' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Editada', estado: 'en curso' })
      .expect(200);

    expect(res.body).toMatchObject({ titulo: 'Editada', estado: 'en curso', descripcion: null, fecha_vencimiento: null });
    expect(new Date(res.body.actualizado_en).getTime()).toBeGreaterThan(new Date(task.actualizado_en as string).getTime());
  });

  it('PUT /tasks/:id responde 404 si la tarea no existe', async () => {
    await request(app)
      .put(`/tasks/${NON_EXISTENT_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'x' })
      .expect(404);
  });

  it('DELETE /tasks/:id elimina la tarea y responde 204', async () => {
    const task = await createTask(token);
    await request(app).delete(`/tasks/${task.id}`).set('Authorization', `Bearer ${token}`).expect(204);
    await request(app).get(`/tasks/${task.id}`).set('Authorization', `Bearer ${token}`).expect(404);
  });
});

describe('Aislamiento entre usuarios', () => {
  let tokenLuisa: string;
  let tokenOtro: string;
  let taskId: string;

  beforeEach(async () => {
    await resetDatabase();
    tokenLuisa = await registerAndLogin(app, 'luisa@example.com');
    tokenOtro = await registerAndLogin(app, 'otro@example.com');
    taskId = (await createTask(tokenLuisa, { titulo: 'Privada de Luisa' })).id;
  });

  it('GET /tasks no muestra tareas de otros usuarios', async () => {
    const res = await request(app).get('/tasks').set('Authorization', `Bearer ${tokenOtro}`).expect(200);
    expect(res.body).toEqual([]);
  });

  it('GET /tasks/:id de una tarea ajena responde 404 (no revela que existe)', async () => {
    await request(app).get(`/tasks/${taskId}`).set('Authorization', `Bearer ${tokenOtro}`).expect(404);
  });

  it('PUT /tasks/:id de una tarea ajena responde 404 y no la modifica', async () => {
    await request(app)
      .put(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${tokenOtro}`)
      .send({ titulo: 'Hackeada' })
      .expect(404);
    const res = await request(app).get(`/tasks/${taskId}`).set('Authorization', `Bearer ${tokenLuisa}`).expect(200);
    expect(res.body.titulo).toBe('Privada de Luisa');
  });

  it('DELETE /tasks/:id de una tarea ajena responde 404 y no la borra', async () => {
    await request(app).delete(`/tasks/${taskId}`).set('Authorization', `Bearer ${tokenOtro}`).expect(404);
    await request(app).get(`/tasks/${taskId}`).set('Authorization', `Bearer ${tokenLuisa}`).expect(200);
  });
});

describe('Rutas generales', () => {
  it('GET /health responde 200 cuando la base de datos está disponible', async () => {
    await request(app).get('/health').expect(200, { status: 'ok', database: 'ok' });
  });

  it('una ruta inexistente responde 404 con el formato estándar de error', async () => {
    const res = await request(app).get('/no-existe').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /docs.json expone la especificación OpenAPI', async () => {
    const res = await request(app).get('/docs.json').expect(200);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(['/auth/register', '/auth/login', '/tasks', '/tasks/{id}']),
    );
  });
});
