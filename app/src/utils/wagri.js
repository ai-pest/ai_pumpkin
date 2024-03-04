'use strict'

import axios from 'axios'
import fs from 'fs'

/**
 * WAGRI からアクセストークンを取得します
 *
 * @return WAGRI アクセストークン
 * `{ access_token: String, token_type: String, expires_in: Number }`
 */
const retrieveAccessToken = async function () {
  // クライアントIDとシークレットを取得
  // eslint-disable-next-line no-multi-spaces
  const clientIdFilepath     = '/opt/secret/wagri_api_client_id/wagri_api_client_id'
  const clientSecretFilepath = '/opt/secret/wagri_api_client_secret/wagri_api_client_secret'

  const clientId = fs.readFileSync(clientIdFilepath)
  const clientSecret = fs.readFileSync(clientSecretFilepath)

  try {
    const payload = `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
    const response = await axios.post(
      'https://api.wagri.net/Token',
      payload,
      { headers: { 'content-type': 'application/x-www-form-urlencoded' } }
    )
    return response.data
  } catch (e) {
    throw Error('Failed to get WAGRI Access Token')
  }
}

export { retrieveAccessToken }
