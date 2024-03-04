'use strict'

/**
 * routes/diagnose の単体テスト
 */

import { describe, expect, test } from '@jest/globals'

import {
  retrieveAccessToken
} from './wagri'

// 単体テスト
describe('Unit test: .js: retrieveAccessToken', () => {
  test('Should respond with an access token', async () => {
    const result = await retrieveAccessToken()
    expect(typeof result.access_token).toBe('string')
    expect(result.token_type).toBe('bearer')
    expect(result.expires_in).toBeGreaterThan(3600)
  })
})
