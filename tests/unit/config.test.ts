import { describe, expect, it } from 'vitest';
import { Config } from '../../src/config/env';

const VALID_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db_test',
  JWT_SECRET: 'x'.repeat(32),
};

function buildWith(env: Record<string, string>): Config {
  return Config.fromEnvForTesting(env);
}

describe('Config (Singleton)', () => {
  it('devuelve siempre la misma instancia', () => {
    const a = Config.getInstance();
    const b = Config.getInstance();
    expect(a).toBe(b);
  });

  it('aplica valores por defecto a las variables opcionales', () => {
    const config = buildWith(VALID_ENV);
    expect(config.port).toBe(3000);
    expect(config.jwtExpiresIn).toBe('1h');
    expect(config.bcryptSaltRounds).toBe(10);
  });

  it('es inmutable', () => {
    const config = buildWith(VALID_ENV);
    expect(() => {
      (config as { port: number }).port = 1;
    }).toThrow();
  });

  it('falla al arrancar si falta una variable obligatoria', () => {
    expect(() => buildWith({ ...VALID_ENV, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it('rechaza un JWT_SECRET demasiado corto', () => {
    expect(() => buildWith({ ...VALID_ENV, JWT_SECRET: 'corto' })).toThrow(/JWT_SECRET/);
  });

  it('rechaza un puerto que no es número', () => {
    expect(() => buildWith({ ...VALID_ENV, PORT: 'abc' })).toThrow(/PORT/);
  });
});
