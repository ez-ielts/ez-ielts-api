import { Hono } from 'hono'
import { speaking as db, uploads } from '../db/queries'
import { readJson, textField } from '../lib/input'
import type { Env } from '../types/env'

export const speaking = new Hono<Env>()
  .get('/', async (c) => {
    const { results } = await db.list(c.env.DB, c.get('userId'))
    return c.json({ items: results })
  })
  .get('/:id', async (c) => {
    const item = await db.get(c.env.DB, c.get('userId'), c.req.param('id'))
    return item ? c.json(item) : c.json({ error: 'not_found' }, 404)
  })
  .post('/', async (c) => {
    const input = await readJson(c.req.raw)
    if (!input || !textField(input.prompt, 2000) || !textField(input.uploadId, 100)) {
      return c.json({ error: 'invalid_input' }, 400)
    }
    const upload = await uploads.get(c.env.DB, c.get('userId'), input.uploadId)
    if (!upload) return c.json({ error: 'upload_not_found' }, 404)
    const id = crypto.randomUUID()
    try {
      await db.create(c.env.DB, c.get('userId'), id, input.prompt.trim(), input.uploadId)
    } catch (error) {
      if (String(error).includes('UNIQUE constraint failed')) return c.json({ error: 'upload_already_used' }, 409)
      throw error
    }
    const item = await db.get(c.env.DB, c.get('userId'), id)
    return c.json(item, 201)
  })
