import config from '../../app.config.js'
import naroPumpkinV1 from './naroPumpkinV1.js'
import hoseiCucumberV4 from './hoseiCucumberV4.js'

/**
 * WAGRIエンドポイント
 */
const wagriEndpoints = {
  naroPumpkinV1,
  hoseiCucumberV4
}

const wagriEndpoint = wagriEndpoints[config.classifierName]

export default wagriEndpoint
