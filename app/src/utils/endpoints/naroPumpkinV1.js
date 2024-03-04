/**
 * カボチャv1識別器用パーサ
 */

// 識別器URL
const url = 'https://api.wagri.net/API/Individual/Naro/PPAPI/plant_disease/naro/rcait-v1/pumpkin'

/**
 * 診断結果のついたファイルを受け取り、うどんこ病の確信度を返します
 * うどんこ病未検出の場合は 0 を返します
 *
 * @param wagriResponse WAGRI API のレスポンス
 * @return {Number} うどんこ病の確信度
 */
const parse = function (wagriResponse) {
  const diseaseScorePairs =
    wagriResponse.assets[0].images[0].annotations[0].labels.disease

  for (const diseaseScore of diseaseScorePairs) {
    if (diseaseScore.class === 'うどんこ病') {
      return diseaseScore.score
    }
  }
  return 0
}

export default { url, parse }
