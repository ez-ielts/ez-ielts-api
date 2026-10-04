export type Env = {
  Bindings: {
    DB: D1Database
    FILES: R2Bucket
    CLERK_JWT_KEY: string
    CLERK_AUTHORIZED_PARTIES: string
    ALLOWED_ORIGINS: string
  }
  Variables: { userId: string }
}
