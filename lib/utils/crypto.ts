import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

function getKey(): Buffer {
  // An empty fallback key would encrypt every stored DB password with a publicly
  // known key. Require the secret to be configured.
  const secret = process.env.AES_SECRET_KEY
  if (!secret) {
    throw new Error('AES_SECRET_KEY environment variable is not set')
  }
  return crypto.createHash('sha256').update(secret).digest()
}

export function encrypt(text: string): string {
  const iv      = crypto.randomBytes(IV_LENGTH)
  const cipher  = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return iv.toString('base64') + ':' + encrypted.toString('base64')
}

export function decrypt(stored: string): string {
  const [ivB64, encB64] = stored.split(':')
  const iv        = Buffer.from(ivB64, 'base64')
  const encrypted = Buffer.from(encB64, 'base64')
  const decipher  = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}