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

describe('roleAtLeast (admin / user model)', () => {
  it('lets any signed-in user operate on their own databases', () => {
    expect(roleAtLeast('user', 'db_operator')).toBe(true)
    expect(roleAtLeast('admin', 'db_operator')).toBe(true)
  })

  it('reserves admin-tier gates for admins only', () => {
    expect(roleAtLeast('admin', 'admin')).toBe(true)
    expect(roleAtLeast('admin', 'db_admin')).toBe(true)
    expect(roleAtLeast('user', 'admin')).toBe(false)
    expect(roleAtLeast('user', 'db_admin')).toBe(false)
  })

  it('denies the unauthenticated', () => {
    expect(roleAtLeast(null, 'db_operator')).toBe(false)
    expect(roleAtLeast(null, 'admin')).toBe(false)
  })
})
