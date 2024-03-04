'use strict'

import fs from 'fs'
import exifr from 'exifr'
import axios from 'axios'

import localEndpoint from '../../utils/endpoints/naroEdgeV1.js'

// 診断エラーのとき、再試行回数の上限
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
 * 画像1枚を受け取り、ローカル診断 API に病害診断リクエストを送信して、診断結果を返す
 *
 * @param file multer ファイルオブジェクト
 * @return 診断結果（[{class: "disease1", score: 0.1234}, ...]）
 * @throws {Error} 診断失敗時
 */
const queryLocalDiagnosis = async function (file) {
  const payload = {
    assets: [
      {
        id: `naro-pumpkin-system-${Math.random() * 100000}`,
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

  const response = await axios.post(localEndpoint.url, payload)

  return response.data
}

/**
 * JPEGファイルの配列を受け取り、ローカル診断 API に1枚ずつ画像を投げ、結果を
 * .diagnosisResponse 属性につけて返します
 *
 * @param files multer ファイルオブジェクトの配列
 * @return {Array} 引数の file オブジェクトに .diagnosisResponse 属性をつけて返す
 */
const queryImagesToLocal = async function (files) {
  let result

  // 1つずつ投げる
  for (const file of files) {
    let triedNTimes = 1
    while (true) {
      try {
        result = await queryLocalDiagnosis(file)
        break
      } catch (e) {
        if (triedNTimes > maxRetries) {
          throw new Error(`Retry limit of ${maxRetries} exceeded`)
        }
        triedNTimes++
        continue
      }
    }
    file.diagnosisResponse = result
  }
  return files
}

/**
 * EXIF 情報と AI 識別結果を属性にもつ JPEG ファイルの配列を受け取り、
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
      powdery_mildew_score: responseParser(file.diagnosisResponse)
    }
  })

  return apiResponse
}

const handler = {
  post: async function (req, res, next) {
    try {
      const filesWithCoordinates = await extractLatLons(req.files)
      const filesWithResults = await queryImagesToLocal(filesWithCoordinates)
      const result = formatResults(filesWithResults, localEndpoint.parse)
      res.json(result)
    } catch (e) {
      console.error(e)
      res.status(400).json('That\'s an error.')
    }
  }
}

export {
  extractLatLons,
  queryLocalDiagnosis,
  base64EncodeJpeg
}
export default handler
