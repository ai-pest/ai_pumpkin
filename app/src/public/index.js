/* global axios L Encoding bootstrap */

class UserDefinedError extends Error {
  constructor (message) {
    super(message)
    this.name = 'UserDefinedError'
  }
}

// ランク別マーカアイコン
// rankedMarkerIcons[level] -> L.Icon
const levelIcons = []
for (const i of Array(6).keys()) {
  levelIcons[i] = new L.Icon({
    iconUrl: `./img/marker-icon-${i}.png`,
    shadowUrl: './img/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })
}

/**
 * うどんこ病の確信度をランクに変換します
 *
 * @param confidence うどんこ病の確信度
 * @return うどんこ病ランク（とりうる値は {0..5} ）
 */
function confidenceToRank (confidence) {
  // 確信度とランクの対応（n 番目の要素はランク n の最大値）
  const maxConfidences = [ 0.25, 0.5, 0.7, 0.85, 0.95 ]
  for (const [rank, maxConf] of maxConfidences.entries()) {
    if (confidence <= maxConf) {
      return rank
    }
  }
  return maxConfidences.length // 最大ランク
}

/**
 * file の配列から、JPEG 画像だけを抽出する
 *
 * @param files File オブジェクトの配列
 * @return files に含まれるJPEG画像の配列
 * @throw Error JPEG画像が1件もないとき
 */
function leaveOnlyJpegs (files) {
  const images = Array.from(files).filter((file) => { return file.type === 'image/jpeg' })

  if (images.length === 0) {
    throw new UserDefinedError('選択したファイルのなかにJPEG画像がありません。JPEGファイルを選択してください。')
  }

  return images
}

/**
 * 識別結果を地図にプロットします
 *
 * API サーバから受け取った画像名、診断結果、位置情報をもとに、
 * 識別結果を地図上に表示します
 *
 * 前回診断時のマーカは消去されます！
 *
 * @param results サーバから受け取ったJSONデータ
 * @param imageBlobs 画像の Blob オブジェクトの配列
 */
function plotResultsOnMap (results, imageBlobs) {
  markerGroup.clearLayers() // 前回のマーカを消去

  // 新しいマーカを植える
  const markers = results.map((result, i) => {
    const imageBlob = imageBlobs[i]
    if (result.coordinates !== undefined) {
      // 確信度をランクに変換
      result.powderyMildewRank = confidenceToRank(result.powdery_mildew_score)
      // マーカの設定
      const icon = levelIcons[result.powderyMildewRank]
      const coordinates = [
        result.coordinates.latitude,
        result.coordinates.longitude
      ]
      const marker = L.marker(coordinates, { icon: icon }).addTo(markerGroup)
      marker.bindPopup(`
        <img class="plottedImage" src=${URL.createObjectURL(imageBlob)} />
        <div class="plottedFilename">
          ${result.name}
        </div>
        <div class="plottedRank">
          うどんこ病ランク: ${result.powderyMildewRank}
        </div>
      `)
      return marker
    } else {
      return undefined
    }
  })

  // マーカが地図におさまるように、表示領域を調整
  if (!markers.every((v) => (v === undefined))) {
    map.fitBounds(markerGroup.getBounds())
  }
}

/**
 * /diagnose に POST する
 *
 * 選択したフォルダに含まれるファイルを API サーバに送信する。
 * 識別結果を取得し、地図上に表示する。
 *
 * @param event アップロードする画像（File オブジェクト）の配列
 */
// eslint-disable-next-line no-unused-vars
async function callDiagnose (fileList) {
  const inProgressModal = new bootstrap.Modal(
    document.getElementById('inProgressModal'), { backdrop: 'static' })

  try {
    const images = leaveOnlyJpegs(fileList)

    // CSV出力ボタンを無効化
    document.getElementById('csvExportButton').setAttribute('disabled', true)

    // モーダル表示
    inProgressModal.show()

    // エンドポイントを取得
    const selectedEndpoint = document.querySelector('input[name="select-model"]:checked').value;
    if (selectedEndpoint === undefined) {
      throw new UserDefinedError('識別モデルを選択してください。')
    } else if (selectedEndpoint === 'offline') {
      endpoint = '/api/diagnose/local'
    } else if (selectedEndpoint === 'wagri') {
      endpoint = '/api/diagnose/wagri'
    } else {
      throw new UserDefinedError('識別モデルが不正です。')
    }

    // 画像を1枚ずつAPIサーバにPOSTする
    const results = []
    for (const image of images) {
      const formData = new FormData()
      formData.append('images', image)
      const res = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      results.push(res.data[0])
    }

    // 全部の画像を診断後
    // 結果を保持
    diagnosticResultStored = results

    // CSV出力ボタンを有効化
    document.getElementById('csvExportButton').removeAttribute('disabled')

    // CSV ダウンロードダイアログを表示
    const completedModal = new bootstrap.Modal(
      document.getElementById('completedModal'), { backdrop: 'static' })
    completedModal.show()

    // TODO: プロットするマーカが1件もないときはエラーメッセージを表示
    plotResultsOnMap(diagnosticResultStored, images)
  } catch (e) {
    console.error(e)
    if (e instanceof UserDefinedError) {
      showErrorModal(e.message)
    } else {
      showErrorModal(
        'エラーが発生しました。しばらく待ってから再度診断するか、別の画像をアップロードしてください。')
    }
  } finally {
    inProgressModal.hide()
  }
}

/**
 * APIレスポンスを受け取り、CSVフォーマットに変換して、その文字列を返す
 *
 * @param apiResponse APIレスポンス
 * @return {String} CSVフォーマットに変換した文字列
 */
function apiResponseToCsv (apiResponse) {
  const headerRow = ['画像名', '緯度', '経度', 'うどんこ病ランク'].join(',')
  const contentRows = apiResponse.map((r) => {
    r.coordinates = {
      latitude: (r.coordinates !== undefined) ? r.coordinates.latitude : '',
      longitude: (r.coordinates !== undefined) ? r.coordinates.longitude : ''
    }
    r.powderyMildewRank = confidenceToRank(r.powdery_mildew_score)
    const rowElements = [
      r.name,
      r.coordinates.latitude,
      r.coordinates.longitude,
      r.powderyMildewRank
    ]
    return rowElements.join(',')
  })
  const allRows = [headerRow, ...contentRows].join('\n')

  return allRows
}

/**
 * UTF-8 文字列を ShiftJIS 形式で URI エンコードする
 *
 * @param stringUtf8
 * @return {String} `stringUtf8` を ShiftJIS 形式で URI エンコードした文字列
 */
function encodeSjisURI (stringUtf8) {
  const utf8Array = Encoding.stringToCode(stringUtf8)
  const sjisArray = Encoding.convert(utf8Array, {
    to: 'SJIS', from: 'UNICODE', fallback: 'html-entity'
  })
  const uriSjis = Encoding.urlEncode(sjisArray)

  return uriSjis
}

/**
 * CSV出力
 */
// eslint-disable-next-line no-unused-vars
function csvExport () {
  const csvData = apiResponseToCsv(diagnosticResultStored)
  const encodedUri = `data:text/csv;charset=utf-8,${encodeSjisURI(csvData)}`
  const link = document.getElementById('csvDownloadLink')
  link.setAttribute('href', encodedUri)
  link.click()
}

/**
 * エラーメッセージとして表示する文言を受け取り、
 * エラーモーダルを表示する
 *
 * @param errorMessage エラーメッセージの文言
 */
function showErrorModal (errorMessage) {
  // すべてのモーダルを一度非表示にする
  const modals = document.getElementsByClassName('modal')
  Array.from(modals).forEach((modal) => {
    (new bootstrap.Modal(modal, { backdrop: 'static' })).hide()
  })

  // 文言を埋め込む
  const errorModalElement = document.getElementById('errorModal')
  const modalBody = errorModalElement.querySelector('.modal-body')
  modalBody.textContent = errorMessage

  // エラーモーダルを表示
  const errorModal = new bootstrap.Modal(
    errorModalElement, { backdrop: 'static' })
  errorModal.show()
}

// オフライン用ベースレイヤの構築
// PMTiles を追加
const p = new pmtiles.PMTiles('/basemap/hokkaido.pmtiles')
const offlineLayer = L.layerGroup([
  pmtiles.leafletRasterLayer(p, {
      maxNativeZoom: 17,
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    })
]);
// 北方領土の表示修正
// OSM の上に海と同色のポリゴンを追加
fetch('/basemap/hoppo-island-base.geojson')
  .then(response => response.json())
  .then(data => {
      offlineLayer.addLayer(
        L.geoJSON(data, {
          style: function(feature) {
            return {
                fillColor: '#AAD3DF',
                fillOpacity: 1,
                weight: 0,
            };
          }
        })
      )
    }
  );
// 陸地を追加
// GeoJSON データの出典: OSMFJ (https://github.com/osmfj/tileserver-gl-site)
fetch('/basemap/hoppo-island.geojson')
  .then(response => response.json())
  .then(data => {
      offlineLayer.addLayer(
        L.geoJSON(data, {
          style: function(feature) {
            return {
                fillColor: '#FFFBF6',
                fillOpacity: 1,
                color: '#FFFBF6',
                weight: 0.5,
            };
          }
        })
      )
    }
  );

const baseMaps = {
  "OpenStreetMap（オフライン版）": offlineLayer,
  OpenStreetMap: L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),
  地理院地図: L.tileLayer(
    'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
      maxNativeZoom: 18,
      maxZoom: 19,
      attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
    }),
  地理院空中写真: L.tileLayer(
    'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', {
      maxNativeZoom: 18,
      maxZoom: 19,
      attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
    }),
}

// 筆ポリゴン
const fudePolygonsStyles = {
  fude: function (properties, zoom) {
    const style = {
      color: '#000000',
      weight: 0.1,
      opacity: 0.5,
      fill: true,
      fillOpacity: 0.5
    }

    // 田は黄色、畑は茶色で表示
    const landCategory = properties.LC
    if (landCategory === '田') {
      style.fillColor = 'rgb(255, 255, 0)'
      return style
    }
    if (landCategory === '畑') {
      style.fillColor = 'rgb(138, 95, 46)'
      return style
    }
    return style
  }
}
const overlayMaps = {
  '農地区画（拡大時のみ表示）': L.vectorGrid.protobuf(
    'https://habs.rad.naro.go.jp/spatial_data/maff_fude_id/mvt/{z}/{x}/{y}.pbf',
    {
      minZoom: 16,
      maxNativeZoom: 16,
      vectorTileLayerStyles: fudePolygonsStyles,
      attribution: "<a href='http://www.maff.go.jp/j/tokei/porigon/index.html' target='_blank'>農林水産省 筆ポリゴンデータ</a>"
    }
  )
}

const map = L.map(
  'map', {
    layers: [baseMaps["OpenStreetMap（オフライン版）"], overlayMaps['農地区画（拡大時のみ表示）']],
    minZoom: 4,
    maxZoom: 19,
  }
)
map.setView([43.635, 142.894], 7) // 北海道全域
L.control.layers(baseMaps, overlayMaps).addTo(map)
const markerGroup = L.featureGroup().addTo(map) // マーカを保持するグループ

// 診断結果の保持
let diagnosticResultStored
