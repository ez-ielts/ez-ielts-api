import { describe, expect, it } from 'vitest'
import app from '../src/index'
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
})
