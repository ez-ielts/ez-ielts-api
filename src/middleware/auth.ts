import { verifyToken } from '@clerk/backend'
import { createMiddleware } from 'hono/factory'
import type { Env } from '../types/env'

export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(c.req.header('Authorization') ?? '')
  if (!match) return c.json({ error: 'unauthorized' }, 401)
  if (!c.env.CLERK_JWT_KEY || !c.env.CLERK_AUTHORIZED_PARTIES) throw new Error('Authentication is not configured')

  try {
    const claims = await verifyToken(match[1], {
      jwtKey: c.env.CLERK_JWT_KEY.replace(/\\n/g, '\n'),
      authorizedParties: c.env.CLERK_AUTHORIZED_PARTIES.split(',').map((s) => s.trim()).filter(Boolean),
    })
    if (!claims.sub) return c.json({ error: 'unauthorized' }, 401)
    c.set('userId', claims.sub)
  } catch {
    return c.json({ error: 'unauthorized' }, 401)
  }
  await next()
})
