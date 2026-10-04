export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
export const AUDIO_TYPES = new Set(['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'])

export async function storeAudio(bucket: R2Bucket, key: string, body: ReadableStream<Uint8Array>, contentType: string): Promise<number> {
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_UPLOAD_BYTES) throw new RangeError('Upload too large')
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  if (length === 0) throw new RangeError('Empty upload')
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  await bucket.put(key, bytes, { httpMetadata: { contentType } })
  return length
}
