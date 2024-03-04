import { describe, test, expect } from '@jest/globals'
import endpoint from './hoseiCucumberV4'

describe('Unit test: utils/parsers/hoseiCucumberV4.js: parse', () => {
  test('Should return confidence for powdery mildew if detected', async () => {
    const testData = {
      assets: [
        {
          images: [
            {
              results: [
                {
                  ranking: [
                    { estimated: 'べと病', probability: 0.8 },
                    { estimated: 'うどんこ病', probability: 0.2 },
                    { estimated: '', probability: 0 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
    const actualScore = endpoint.parse(testData)
    expect(actualScore).toBe(0.2)
  })
  test('Should return 0 if powdery mildew was not detected', async () => {
    const testData = {
      assets: [
        {
          images: [
            {
              results: [
                {
                  ranking: [
                    { estimated: 'べと病', probability: 0.79 },
                    { estimated: '健全', probability: 0.2 },
                    { estimated: '黄化葉巻病', probability: 0.01 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
    const actualScore = endpoint.parse(testData)
    expect(actualScore).toBe(0)
  })
})
