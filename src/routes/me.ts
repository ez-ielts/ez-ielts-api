import { Hono } from 'hono'
import type { Env } from '../types/env'

export const me = new Hono<Env>().get('/', (c) => c.json({ userId: c.get('userId') }))
