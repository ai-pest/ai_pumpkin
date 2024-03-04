/**
 * 法政大キュウリ葉表v4識別器用パーサ
 */

// 識別器URL
const url = 'https://api.wagri.net/API/Individual/Naro/PRISM/plant_disease/hosei/v4/cucumber/haomote'

/**
 * 診断結果のついたファイルを受け取り、うどんこ病の確信度を返します
 * うどんこ病未検出の場合は 0 を返します
 *
 * @param wagriResponse WAGRI API のレスポンス
 * @return {Number} うどんこ病の確信度
 */
const parse = function (wagriResponse) {
  const results = wagriResponse.assets[0].images[0].results[0].ranking

  for (const result of results) {
    if (result.estimated === 'うどんこ病') {
      return result.probability
    }
  }
  return 0
}

export default { url, parse }
