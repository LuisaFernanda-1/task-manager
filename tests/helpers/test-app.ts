import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Config } from '../../src/config/env';
import { getPool } from '../../src/persistence/database';

export function buildTestApp(): Express {
  return createApp({ config: Config.getInstance(), pool: getPool() });
}

export async function resetDatabase(): Promise<void> {
  await getPool().query('TRUNCATE tareas, usuarios RESTART IDENTITY CASCADE');
}

export async function registerAndLogin(
  app: Express,
  email = 'luisa@example.com',
  password = 'MiClave123',
): Promise<string> {
  await request(app).post('/auth/register').send({ nombre: 'Usuario Prueba', email, password }).expect(201);
  const res = await request(app).post('/auth/login').send({ email, password }).expect(200);
  return res.body.token as string;
}
