import { describe, expect, it } from 'vitest'
import app from '../src/index'
import { readAccess } from '../src/middleware/auth'
import type { Env } from '../src/types/env'

const env = {
  ALLOWED_ORIGINS: 'https://www.ez-ielts.com',
  CLERK_JWT_KEY: 'test',
  CLERK_AUTHORIZED_PARTIES: 'https://www.ez-ielts.com',
} as Env['Bindings']

describe('public and protected routes', () => {
  it('exposes health without authentication', async () => {
    const response = await app.request('/v1/health', {}, env)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('rejects missing bearer tokens', async () => {
    for (const path of ['/v1/me', '/v1/writing', '/v1/speaking', '/v1/uploads/test']) {
      const response = await app.request(path, {}, env)
      expect(response.status).toBe(401)
    }
  })

  it('rejects malformed bearer tokens', async () => {
    const response = await app.request('/v1/me', { headers: { Authorization: 'Bearer abc def' } }, env)
    expect(response.status).toBe(401)
  })

  it('only allows configured browser origins', async () => {
    const allowed = await app.request('/v1/health', { headers: { Origin: 'https://www.ez-ielts.com' } }, env)
    const denied = await app.request('/v1/health', { headers: { Origin: 'https://attacker.example' } }, env)
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://www.ez-ielts.com')
    expect(denied.headers.get('Access-Control-Allow-Origin')).not.toBe('https://attacker.example')
  })

  it('answers preflight with the headers the web client sends', async () => {
    const response = await app.request('/v1/writing', { method: 'OPTIONS', headers: { Origin: 'https://www.ez-ielts.com', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type,idempotency-key' } }, env)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Authorization,Content-Type,Idempotency-Key')
    const actual = await app.request('/v1/health', { headers: { Origin: 'https://www.ez-ielts.com' } }, env)
    expect(actual.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After')
  })
})

describe('role and plan claims', () => {
  it('accepts known roles and falls back to customer on free', () => {
    expect(readAccess({ role: 'admin', plan: 'pro' })).toEqual({ role: 'admin', plan: 'pro' })
    expect(readAccess({})).toEqual({ role: 'customer', plan: 'free' })
    expect(readAccess({ role: 'superuser', plan: '' })).toEqual({ role: 'customer', plan: 'free' })
    expect(readAccess({ role: ['admin'], plan: 42 })).toEqual({ role: 'customer', plan: 'free' })
  })
})
