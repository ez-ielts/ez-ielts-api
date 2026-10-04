import { Hono } from 'hono'
import type { Env } from '../types/env'

export const health = new Hono<Env>().get('/', (c) => c.json({ status: 'ok' }))
