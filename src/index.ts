import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requireAuth } from './middleware/auth'
import { onError } from './middleware/error-handler'
import { docs } from './routes/docs'
import { health } from './routes/health'
import { me } from './routes/me'
import { writing } from './routes/writing'
import { speaking } from './routes/speaking'
import { uploads } from './routes/uploads'
import type { Env } from './types/env'

const app = new Hono<Env>()
app.onError(onError)
app.use('*', cors({
  origin: (origin, c) => c.env.ALLOWED_ORIGINS?.split(',').map((s: string) => s.trim()).includes(origin) ? origin : '',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  maxAge: 86400,
}))
app.route('/', docs)
app.route('/v1/health', health)
app.use('/v1/me/*', requireAuth)
app.use('/v1/writing/*', requireAuth)
app.use('/v1/speaking/*', requireAuth)
app.use('/v1/uploads/*', requireAuth)
app.route('/v1/me', me)
app.route('/v1/writing', writing)
app.route('/v1/speaking', speaking)
app.route('/v1/uploads', uploads)
app.notFound((c) => c.json({ error: 'not_found' }, 404))

export default app
