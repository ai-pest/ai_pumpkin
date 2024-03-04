import { describe, test, expect } from '@jest/globals'
import endpoint from './naroEdgeV1'

describe('Unit test: utils/parsers/naroEdgeV1.js: parse', () => {
  test('Should return confidence for powdery mildew if detected', async () => {
    const testData = {
      assets: [
        {
          images: [
            {
              results: [
                {
                  candidates: [
                    { estimated: 'アザミウマ類', probability: 0.8 },
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
                  candidates: [
                    { estimated: 'チャノホコリダニ', probability: 0.79 },
                    { estimated: '健全', probability: 0.2 },
                    { estimated: 'ハスモンヨトウ', probability: 0.01 }
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
