'use strict'

import fs from 'fs'
import exifr from 'exifr'
import axios from 'axios'

import { retrieveAccessToken } from '../../utils/wagri.js'
import wagriEndpoint from '../../utils/endpoints/index.js'

// WAGRI サーバが "Too many requests" (429) エラーのとき、再試行回数の上限
const maxRetries = 10

/**
 * EXIF メタデータからジオタグ情報を抽出する
 *
 * @param files multer ファイルオブジェクトの配列
 * @return {Array} 引数の file オブジェクトに .coordinates 属性をつけて返す
 * * `.coordinates.latitude`: 経度
 * * `.coordinates.longitude`: 緯度
 */
const extractLatLons = async function (files) {
  const latLons = await Promise.all(files.map((file) => exifr.gps(file.path)))
  const fileWithCoordinates = files.map((file, i) => {
    file.coordinates = latLons[i]
    return file
  })
  return fileWithCoordinates
}

/**
 * JPEG 画像のファイルパスを受け取り、画像をエンコードして返す
 *
 * 返り値の例: `data:image/jpeg;base64,AbCDEfg...`
 * @param {String} path JPEG 画像のファイルパス
 * @returns {String} Base64 エンコードされた画像
 */
const base64EncodeJpeg = function (path) {
  const buffer = fs.readFileSync(path)
  const header = 'data:image/jpeg;base64,'
  return header + (buffer.toString('base64'))
}

/**
 * 画像1枚を受け取り、WAGRI API に病害診断リクエストを送信して、診断結果を返す
 *
 * @param file multer ファイルオブジェクト
 * @param {String} accessToken WAGRI アクセストークン
 * @return 診断結果（[{class: "disease1", score: 0.1234}, ...]）
 * @throws {Error} 診断失敗時
 */
const queryWagriDiagnosis = async function (file, accessToken) {
  if (accessToken === undefined) {
    throw Error('AccessToken is missing.')
  }
  const payload = {
    assets: [
      {
        id: `naro-pumpkin-system-${Math.random() * 100000}`,
        'X-User-Id': 'naro-pumpkin-system',
        images: [
          {
            filename: file.originalname,
            filedate: '1970/01/01',
            data: base64EncodeJpeg(file.path)
          }
        ]
      }
    ]
  }
  const vendorId = fs.readFileSync('/opt/secret/wagri_api_vendor_id/wagri_api_vendor_id')
  const headers = {
    'X-Authorization': accessToken,
    'X-User-Id': 'naro_pumpkin_udonko_system_user',
    Authorization: vendorId
  }

  const response = await axios.post(wagriEndpoint.url, payload, { headers })

  return response.data
}

/**
 * 指定したミリ秒だけ待つ setTimeout のプロミスを返します
 *
 * @param {Number} awaitTimeMillis
 * @returns {Promise} setTimeout のプロミス
 */
const delay = function (awaitTimeMillis) {
  return new Promise((resolve) => {
    setTimeout(() => { resolve() }, awaitTimeMillis)
  })
}

/**
 * JPEGファイルの配列を受け取り、WAGRI に1枚ずつ画像を投げ、結果を
 * .wagriResponse 属性につけて返します
 *
 * @param files multer ファイルオブジェクトの配列
 * @return {Array} 引数の file オブジェクトに .wagriResponse 属性をつけて返す
 */
const queryImagesToWagri = async function (files) {
  let accessToken = (await retrieveAccessToken()).access_token
  let result

  // 1つずつ投げる
  // * 429エラー (Too many requests) の場合は、数秒待ってリトライする
  //   -> maxRetries 回リトライしてもエラーになったら、診断を中止する
  // * 401エラーの場合は、アクセストークンの期限切れとみなして1回だけリトライ
  //   -> リトライ後もエラーになったら、診断を中止する
  for (const file of files) {
    let triedNTimes = 1
    while (true) {
      try {
        result = await queryWagriDiagnosis(file, accessToken)
        break
      } catch (e) {
        if (e.response.status === 429 && triedNTimes > maxRetries) {
          throw new Error(`Retry limit of ${maxRetries} exceeded`)
        }
        if (e.response.status === 429) {
          const awaitTimeMillis = (Math.random() * 10 + 1) * 1000 // 数秒待つ
          await delay(awaitTimeMillis)
          triedNTimes++
          continue
        }
        if (e.response.status !== 401) {
          throw e
        }
        accessToken = (await retrieveAccessToken()).access_token
        result = await queryWagriDiagnosis(file, accessToken)
        break
      }
    }
    file.wagriResponse = result
  }
  return files
}

/**
 * EXIF 情報と WAGRI 識別結果を属性にもつ JPEG ファイルの配列を受け取り、
 * APIレスポンスを整形して返します
 *
 * @param {Array} files multer オブジェクトの配列
 * @param {Function} responseParser 識別結果を受け取り、うどんこ病の確信度を返す関数
 * @return {Array} /api/diagnose で返すAPIレスポンス
 */
const formatResults = function (files, responseParser) {
  const apiResponse = files.map((file) => {
    return {
      name: file.originalname,
      coordinates: file.coordinates,
      powdery_mildew_score: responseParser(file.wagriResponse)
    }
  })

  return apiResponse
}

const handler = {
  post: async function (req, res, next) {
    try {
      const filesWithCoordinates = await extractLatLons(req.files)
      const filesWithResults = await queryImagesToWagri(filesWithCoordinates)
      const result = formatResults(filesWithResults, wagriEndpoint.parse)
      await delay(3000) // 診断サーバの負荷軽減
      res.json(result)
    } catch (e) {
      console.error(e)
      res.status(400).json('That\'s an error.')
    }
  }
}

export {
  extractLatLons,
  queryWagriDiagnosis,
  base64EncodeJpeg
}
export default handler
