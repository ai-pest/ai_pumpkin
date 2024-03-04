/**
 * 法政大キュウリ葉表v4識別器用パーサ
 */

// 識別器URL
const url = 'http://ai/wsgi'

/**
 * 診断結果のついたファイルを受け取り、うどんこ病の確信度を返します
 * うどんこ病未検出の場合は 0 を返します
 *
 * @param wagriResponse WAGRI API のレスポンス
 * @return {Number} うどんこ病の確信度
 */
const parse = function (wagriResponse) {
  console.log("API Response")
  console.log(wagriResponse.assets[0].images[0].results[0].candidates)
  const candidates = wagriResponse.assets[0].images[0].results[0].candidates

  for (const candidate of candidates) {
    if (candidate.estimated === 'うどんこ病') {
      return candidate.probability
    }
  }
  return 0
}

export default { url, parse }
