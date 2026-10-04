import { Hono } from 'hono'
import { AUDIO_TYPES, MAX_UPLOAD_BYTES } from '../services/storage'
import { MAX_METADATA_BYTES } from './me'
import type { Env } from '../types/env'

const error = (description: string) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } })
const json = (description: string, ref: string) => ({ description, content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } } })
const list = (ref: string) => ({ description: 'Latest 50, newest first', content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: `#/components/schemas/${ref}` } } } } } } })
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }]
const authErrors = { 401: error('Missing or invalid Clerk token') }

// ponytail: hand-written spec, keep in sync with src/routes; switch to @hono/zod-openapi if it drifts.
const spec = {
  openapi: '3.1.0',
  info: { title: 'EZ IELTS API', version: '0.1.0' },
  servers: [{ url: '/' }],
  security: [{ bearer: [] }],
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Clerk session token' } },
    schemas: {
      Me: { type: 'object', properties: { userId: { type: 'string' }, role: { type: 'string', enum: ['admin', 'support', 'customer'] }, plan: { type: 'string', example: 'free' }, metadata: { type: 'object', additionalProperties: true } } },
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      Writing: { type: 'object', properties: { id: { type: 'string' }, prompt: { type: 'string' }, response: { type: 'string' }, created_at: { type: 'string', format: 'date-time' } } },
      Speaking: { type: 'object', properties: { id: { type: 'string' }, prompt: { type: 'string' }, upload_id: { type: 'string' }, created_at: { type: 'string', format: 'date-time' } } },
      Upload: { type: 'object', properties: { id: { type: 'string' }, contentType: { type: 'string' }, byteSize: { type: 'integer' } } },
    },
  },
  paths: {
    '/v1/health': { get: { tags: ['system'], summary: 'Health check', security: [], responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } } } } },
    '/v1/me': { get: { tags: ['me'], summary: 'Current user and metadata', responses: { 200: json('Current user', 'Me'), ...authErrors } } },
    '/v1/me/metadata': {
      put: {
        tags: ['me'],
        summary: 'Replace user metadata',
        description: `Replaces the whole metadata object (max ${MAX_METADATA_BYTES / 1024} KB as JSON). To change one field, GET, modify, then PUT.`,
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: true, example: { targetBand: 7, examDate: '2026-12-01' } } } } },
        responses: { 200: json('Saved', 'Me'), 400: error('invalid_input'), ...authErrors },
      },
    },
    '/v1/writing': {
      get: { tags: ['writing'], summary: 'List writing submissions', responses: { 200: list('Writing'), ...authErrors } },
      post: {
        tags: ['writing'],
        summary: 'Create writing submission',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['prompt', 'response'], properties: { prompt: { type: 'string', maxLength: 2000 }, response: { type: 'string', maxLength: 20000 } } } } } },
        responses: { 201: json('Created', 'Writing'), 400: error('invalid_input'), ...authErrors },
      },
    },
    '/v1/writing/{id}': { get: { tags: ['writing'], summary: 'Get writing submission', parameters: idParam, responses: { 200: json('Submission', 'Writing'), 404: error('not_found'), ...authErrors } } },
    '/v1/speaking': {
      get: { tags: ['speaking'], summary: 'List speaking submissions', responses: { 200: list('Speaking'), ...authErrors } },
      post: {
        tags: ['speaking'],
        summary: 'Create speaking submission',
        description: 'Create a speaking submission from an audio upload. Each upload can be used once.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['prompt', 'uploadId'], properties: { prompt: { type: 'string', maxLength: 2000 }, uploadId: { type: 'string' } } } } } },
        responses: { 201: json('Created', 'Speaking'), 400: error('invalid_input'), 404: error('upload_not_found'), 409: error('upload_already_used'), ...authErrors },
      },
    },
    '/v1/speaking/{id}': { get: { tags: ['speaking'], summary: 'Get speaking submission', parameters: idParam, responses: { 200: json('Submission', 'Speaking'), 404: error('not_found'), ...authErrors } } },
    '/v1/uploads': {
      post: {
        tags: ['uploads'],
        summary: 'Upload audio',
        description: `Upload raw audio as the request body (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB). Rejected with 507 once total storage reaches 9 GB.`,
        requestBody: { required: true, content: Object.fromEntries([...AUDIO_TYPES].map((t) => [t, { schema: { type: 'string', format: 'binary' } }])) },
        responses: { 201: json('Uploaded', 'Upload'), 400: error('invalid_upload'), 507: error('storage_full'), ...authErrors },
      },
    },
    '/v1/uploads/{id}': { get: { tags: ['uploads'], summary: 'Download audio', parameters: idParam, responses: { 200: { description: 'Audio bytes', content: { 'audio/*': { schema: { type: 'string', format: 'binary' } } } }, 404: error('not_found'), ...authErrors } } },
  },
}

const page = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>EZ IELTS API</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/v1/openapi.json', dom_id: '#ui', persistAuthorization: true })</script>
</body></html>`

export const docs = new Hono<Env>()
  .get('/v1/openapi.json', (c) => c.json(spec))
  .get('/docs', (c) => c.html(page))
