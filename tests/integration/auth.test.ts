import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closePool, getPool } from '../../src/persistence/database';
import { buildTestApp, resetDatabase } from '../helpers/test-app';

const app = buildTestApp();
const validUser = { nombre: 'Luisa Ovallos', email: 'luisa@example.com', password: 'MiClave123' };

afterAll(closePool);

describe('POST /auth/register', () => {
  beforeEach(resetDatabase);

  it('registra un usuario y responde 201 sin la contraseña', async () => {
    const res = await request(app).post('/auth/register').send(validUser).expect(201);
    expect(res.body).toMatchObject({ nombre: 'Luisa Ovallos', email: 'luisa@example.com' });
    expect(res.body.id).toBeDefined();
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('guarda la contraseña como hash bcrypt, nunca en texto plano', async () => {
    await request(app).post('/auth/register').send(validUser).expect(201);
    const { rows } = await getPool().query<{ password_hash: string }>('SELECT password_hash FROM usuarios');
    expect(rows[0]?.password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0]?.password_hash).not.toContain(validUser.password);
  });

  it('responde 409 si el email ya está registrado, aunque cambien las mayúsculas', async () => {
    await request(app).post('/auth/register').send(validUser).expect(201);
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validUser, email: 'LUISA@Example.com' })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('responde 400 con el detalle de cada campo inválido', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ nombre: 'L', email: 'no-es-email', password: '123' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['body.nombre', 'body.email', 'body.password']));
  });

  it('rechaza campos que no forman parte del esquema', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validUser, rol: 'admin' })
      .expect(400);
    expect(res.body.error.details).toContainEqual({ field: 'body.rol', message: 'Campo no permitido' });
  });

  it('rechaza contraseñas de más de 72 caracteres (límite de bcrypt)', async () => {
    await request(app)
      .post('/auth/register')
      .send({ ...validUser, password: 'a'.repeat(73) })
      .expect(400);
  });

  it('responde 400 si el cuerpo no es un JSON válido', async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await resetDatabase();
    await request(app).post('/auth/register').send(validUser).expect(201);
  });

  it('devuelve un JWT con credenciales correctas', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: validUser.email, password: validUser.password })
      .expect(200);
    expect(res.body.tipo).toBe('Bearer');
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.usuario.email).toBe(validUser.email);
  });

  it('acepta el email con otras mayúsculas', async () => {
    await request(app).post('/auth/login').send({ email: 'Luisa@Example.com', password: validUser.password }).expect(200);
  });

  it('responde 401 con contraseña incorrecta', async () => {
    const res = await request(app).post('/auth/login').send({ email: validUser.email, password: 'Incorrecta1' }).expect(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('responde 401 con el mismo mensaje si el email no existe', async () => {
    const wrongPassword = await request(app).post('/auth/login').send({ email: validUser.email, password: 'Incorrecta1' });
    const unknownEmail = await request(app).post('/auth/login').send({ email: 'nadie@example.com', password: 'Incorrecta1' });
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });
});
