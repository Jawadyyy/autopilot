import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt } from '@/lib/utils/crypto'
import { roleAtLeast } from '@/app/components/ConnectionContext'

beforeAll(() => {
  process.env.AES_SECRET_KEY = 'unit-test-aes-key-please-change-32'
})

describe('crypto (stored DB passwords)', () => {
  it('round-trips a value', () => {
    const enc = encrypt('s3cr3t-password')
    expect(enc).toContain(':')
    expect(decrypt(enc)).toBe('s3cr3t-password')
  })

  it('uses a random IV (ciphertext differs each call)', () => {
    expect(encrypt('same-input')).not.toBe(encrypt('same-input'))
  })
})

describe('roleAtLeast (RBAC hierarchy)', () => {
  it('grants when the role meets or exceeds the requirement', () => {
    expect(roleAtLeast('db_admin', 'db_operator')).toBe(true)
    expect(roleAtLeast('db_operator', 'db_operator')).toBe(true)
    expect(roleAtLeast('db_admin', 'db_viewer')).toBe(true)
  })

  it('denies when below the requirement or unauthenticated', () => {
    expect(roleAtLeast('db_viewer', 'db_operator')).toBe(false)
    expect(roleAtLeast('db_operator', 'db_admin')).toBe(false)
    expect(roleAtLeast(null, 'db_viewer')).toBe(false)
  })
})
