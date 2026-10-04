export type Writing = {
  id: string
  prompt: string
  response: string
  created_at: string
}

export type Speaking = {
  id: string
  prompt: string
  upload_id: string
  created_at: string
}

export type Upload = {
  id: string
  object_key: string
  content_type: string
  byte_size: number
  created_at: string
}
