import { verifyToken } from '@clerk/backend'
import { createMiddleware } from 'hono/factory'
import type { Env, Role } from '../types/env'

const ROLES: readonly Role[] = ['admin', 'support', 'customer']

// Role and plan come from Clerk publicMetadata via session token claims; anything unexpected falls back to the least privilege.
export function readAccess(claims: Record<string, unknown>): { role: Role; plan: string } {
  const role = ROLES.includes(claims.role as Role) ? claims.role as Role : 'customer'
  const plan = typeof claims.plan === 'string' && claims.plan ? claims.plan : 'free'
  return { role, plan }
}

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
    const { role, plan } = readAccess(claims)
    c.set('role', role)
    c.set('plan', plan)
  } catch {
    return c.json({ error: 'unauthorized' }, 401)
  }
  await next()
})
