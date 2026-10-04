import { Hono } from 'hono'
import { uploads as db } from '../db/queries'
import { AUDIO_TYPES, MAX_UPLOAD_BYTES, storeAudio } from '../services/storage'
import type { Env } from '../types/env'

export const uploads = new Hono<Env>()
  .post('/', async (c) => {
    const contentType = (c.req.header('Content-Type') ?? '').split(';')[0].toLowerCase()
    const declaredSize = c.req.header('Content-Length')
    if (!AUDIO_TYPES.has(contentType) || (declaredSize && (!Number.isSafeInteger(Number(declaredSize)) || Number(declaredSize) > MAX_UPLOAD_BYTES)) || !c.req.raw.body) {
      return c.json({ error: 'invalid_upload', maxBytes: MAX_UPLOAD_BYTES }, 400)
    }
    const id = crypto.randomUUID()
    const key = `${c.get('userId')}/${id}`
    let size: number
    try {
      size = await storeAudio(c.env.FILES, key, c.req.raw.body, contentType)
    } catch (error) {
      if (error instanceof RangeError) return c.json({ error: 'invalid_upload' }, 400)
      throw error
    }
    try {
      await db.create(c.env.DB, c.get('userId'), id, key, contentType, size)
    } catch (error) {
      await c.env.FILES.delete(key)
      throw error
    }
    return c.json({ id, contentType, byteSize: size }, 201)
  })
  .get('/:id', async (c) => {
    const upload = await db.get(c.env.DB, c.get('userId'), c.req.param('id'))
    if (!upload) return c.json({ error: 'not_found' }, 404)
    const object = await c.env.FILES.get(upload.object_key)
    if (!object) return c.json({ error: 'not_found' }, 404)
    return new Response(object.body, {
      headers: {
        'Content-Type': upload.content_type,
        'Content-Length': String(upload.byte_size),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  })
