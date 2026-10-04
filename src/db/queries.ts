import type { Writing, Speaking, Upload } from './types'

export const writing = {
  list: (db: D1Database, userId: string) => db.prepare('SELECT id, prompt, response, created_at FROM writing_submissions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50').bind(userId).all<Writing>(),
  get: (db: D1Database, userId: string, id: string) => db.prepare('SELECT id, prompt, response, created_at FROM writing_submissions WHERE user_id = ? AND id = ?').bind(userId, id).first<Writing>(),
  create: (db: D1Database, userId: string, id: string, prompt: string, response: string) => db.prepare('INSERT INTO writing_submissions (id, user_id, prompt, response) VALUES (?, ?, ?, ?)').bind(id, userId, prompt, response).run(),
}

export const speaking = {
  list: (db: D1Database, userId: string) => db.prepare('SELECT id, prompt, upload_id, created_at FROM speaking_submissions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50').bind(userId).all<Speaking>(),
  get: (db: D1Database, userId: string, id: string) => db.prepare('SELECT id, prompt, upload_id, created_at FROM speaking_submissions WHERE user_id = ? AND id = ?').bind(userId, id).first<Speaking>(),
  create: (db: D1Database, userId: string, id: string, prompt: string, uploadId: string) => db.prepare('INSERT INTO speaking_submissions (id, user_id, prompt, upload_id) VALUES (?, ?, ?, ?)').bind(id, userId, prompt, uploadId).run(),
}

export const uploads = {
  get: (db: D1Database, userId: string, id: string) => db.prepare('SELECT id, object_key, content_type, byte_size, created_at FROM uploads WHERE user_id = ? AND id = ?').bind(userId, id).first<Upload>(),
  create: (db: D1Database, userId: string, id: string, key: string, contentType: string, byteSize: number) => db.prepare('INSERT INTO uploads (id, user_id, object_key, content_type, byte_size) VALUES (?, ?, ?, ?, ?)').bind(id, userId, key, contentType, byteSize).run(),
}
