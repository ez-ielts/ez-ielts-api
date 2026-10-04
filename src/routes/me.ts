import { Hono } from 'hono'
import { userMetadata as db } from '../db/queries'
import { readJson } from '../lib/input'
import type { Env } from '../types/env'

export const MAX_METADATA_BYTES = 16 * 1024

export const me = new Hono<Env>()
  .get('/', async (c) => {
    const data = await db.get(c.env.DB, c.get('userId'))
    return c.json({ userId: c.get('userId'), metadata: data ? JSON.parse(data) : {} })
  })
  .put('/metadata', async (c) => {
    const input = await readJson(c.req.raw)
    const data = input && JSON.stringify(input)
    if (!data || new TextEncoder().encode(data).byteLength > MAX_METADATA_BYTES) {
      return c.json({ error: 'invalid_input', maxBytes: MAX_METADATA_BYTES }, 400)
    }
    await db.set(c.env.DB, c.get('userId'), data)
    return c.json({ userId: c.get('userId'), metadata: input })
  })
