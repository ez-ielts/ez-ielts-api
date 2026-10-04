import type { ErrorHandler } from 'hono'
import type { Env } from '../types/env'

export const onError: ErrorHandler<Env> = (error, c) => {
  console.error(error)
  return c.json({ error: 'internal_error' }, 500)
}
