import { Hono } from 'hono'
import { writing as db } from '../db/queries'
import { readJson, textField } from '../lib/input'
import type { Env } from '../types/env'

export const writing = new Hono<Env>()
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
    if (!input || !textField(input.prompt, 2000) || !textField(input.response, 20000)) {
      return c.json({ error: 'invalid_input' }, 400)
    }
    const id = crypto.randomUUID()
    await db.create(c.env.DB, c.get('userId'), id, input.prompt.trim(), input.response.trim())
    const item = await db.get(c.env.DB, c.get('userId'), id)
    return c.json(item, 201)
  })
