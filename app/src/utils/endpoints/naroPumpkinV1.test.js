import { describe, test, expect } from '@jest/globals'
import endpoint from './naroPumpkinV1'

describe('Unit test: utils/parsers/naroPumpkinV1.js: parse', () => {
  test('Should return confidence for powdery mildew if detected', async () => {
    const testData = {
      assets: [
        {
          images: [
            {
              annotations: [
                {
                  labels: {
                    disease: [
                      { class: 'べと病', score: 0.8 },
                      { class: 'うどんこ病', score: 0.2 },
                      { class: '', score: 0 }
                    ]
                  }
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
              annotations: [
                {
                  labels: {
                    disease: [
                      { class: 'べと病', score: 0.79 },
                      { class: '黄化葉巻病', score: 0.2 },
                      { class: 'MYSV', score: 0.01 }
                    ]
                  }
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
