'use strict'

/**
 * routes/diagnose の単体テスト
 */

import fs from 'fs'
import json from 'json5'
import request from 'supertest'
import { jest, describe, expect, test } from '@jest/globals'

import { app } from '../../app'
import {
  extractLatLons,
  queryWagriDiagnosis,
  base64EncodeJpeg
} from './wagri'
import {
  retrieveAccessToken
} from '../../utils/wagri'

/**
 * テストデータ
 */
const authInfo = pickBasicAuthUser()
const testFiles = [
  { path: 'test_asset/images/no_gps_0.JPG', originalname: 'no_gps_0.JPG' },
  { path: 'test_asset/images/with_gps_0.JPG', originalname: 'with_gps_0.JPG' }
]
const expectedResults = [
  {
    name: 'no_gps_0.JPG',
    coordinates: undefined
  },
  {
    name: 'with_gps_0.JPG',
    coordinates: { latitude: 36.01258, longitude: 140.09635 }
  }
]

// ヘルパ関数
/**
 * テストで使う Basic 認証用ユーザを1名返します
 *
 * @return {{string, string}} ユーザ名, パスワード
 */
function pickBasicAuthUser () {
  const basicAuthUsers = json.parse(fs.readFileSync('/opt/secret/auth/auth'))
  const user = Object.getOwnPropertyNames(basicAuthUsers)[0]
  const password = basicAuthUsers[user]
  return { user, password }
}
/**
 * APIの返り値と expectedResults の LatLon を比較し、合っているか確認します
 *
 * @param actualResults APIの返り値
 */
function validateLatLonResults (actualResults) {
  for (const [i, actual] of actualResults.entries()) {
    const expected = expectedResults[i]
    // coordinates の有無チェック
    if (expected.coordinates === undefined) {
      expect(actual.coordinates).toBeUndefined()
    } else {
      // coordinates の中身チェック
      // 丸め誤差は許容（誤差が無ければ toBe で良かったのだが）
      expect(actual.coordinates.latitude)
        .toBeCloseTo(expected.coordinates.latitude, 5)
      expect(actual.coordinates.longitude)
        .toBeCloseTo(expected.coordinates.longitude, 5)
    }
  }
}

// 単体テスト
describe('Unit test: routes/diagnose.js: extractLatLons', () => {
  test('Should extract LatLon info', async () => {
    const actualResults = await extractLatLons(testFiles)
    validateLatLonResults(actualResults)
  })
})

describe('Unit test: routes/diagnose.js: base64EncodeJpeg', () => {
  test('Should return a decodable string', async () => {
    const actualBase64 = base64EncodeJpeg(testFiles[0].path)
    // ヘッダ
    const actualBase64Header = actualBase64.slice(0, 23)
    expect(actualBase64Header).toBe('data:image/jpeg;base64,')
    // ボディ
    const actualBase64Body = actualBase64.slice(23)
    const actualBlob = Buffer.from(actualBase64Body, 'base64')
    const expectedBlob = fs.readFileSync(testFiles[0].path)
    expect(actualBlob).toStrictEqual(expectedBlob)
  })
})

describe('Unit test: routes/diagnose.js: queryWagriDiagnosis', () => {
  // TODO: app.config.js の設定にかかわらず、utils/endpoints にあるすべての
  // エンドポイントを試験対象とする

  test('Should return the diagnostic result', async () => {
    // アクセストークンは固定値にできない。単体テストにならないが、仕方ない。
    const accessToken = (await retrieveAccessToken()).access_token

    // クエリを投げる
    const actualResults = []
    try {
      for (const [index, testFile] of testFiles.entries()) {
        actualResults[index] = await queryWagriDiagnosis(testFile, accessToken)
      }
    } catch (e) {
      console.log(e)
      throw Error(`Test: Failed to query WAGRI: ${e.message}`)
    }

    // データの検査
    expect(actualResults).toHaveLength(2)
    for (const actualResult of actualResults) {
      expect(actualResult.assets).not.toBeUndefined()
    }
  })
})

// E2Eテスト
describe('E2E test: /api/diagnose', () => {
  // 遅延分+α タイムアウトを延ばす
  jest.setTimeout(15000)

  test('Should respond to a POST with the result', async () => {
    // 連続してWAGRIリクエストを投げると 429 エラーになるので、遅延させる
    await new Promise((resolve, reject) => setTimeout(resolve, 2000))

    // クエリを投げる
    let req = request(app)
      .post('/api/diagnose/wagri')
      .auth(authInfo.user, authInfo.password)
    for (const file of testFiles) {
      req = req.attach('images', file.path)
    }

    const response = await req

    expect(response.status).toBe(200)
    // ボディの検査
    //  - ファイル名
    //  - 座標
    //  - うどんこ病スコア
    expect(response.body).toHaveLength(2)
    for (const [ index, result ] of response.body.entries()) {
      expect(result.name).toBe(expectedResults[index].name)
    }
    validateLatLonResults(response.body)
    for (const result of response.body) {
      expect(result).toHaveProperty('powdery_mildew_score')
      expect(result.powdery_mildew_score).toBeGreaterThanOrEqual(0)
      expect(result.powdery_mildew_score).toBeLessThanOrEqual(1)
    }
  })
  test('Should respond to an empty POST request with 400 error', async () => {
    const response = await request(app)
      .post('/api/diagnose/wagri')
      .auth(authInfo.user, authInfo.password)
    expect(response.status).toBe(400)
  })
  test('Should respond to an unauthorized request with 401 error', async () => {
    const response = await request(app)
      .post('/api/diagnose')
      .auth('bad_user', 'password')
    expect(response.status).toBe(401)
  })
})
