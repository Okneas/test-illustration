import { describe, expect, it } from 'vitest'
import { createRandom, hashString } from './random'

describe('createRandom', () => {
  it('для одного зерна даёт одну последовательность', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('для разных зёрен даёт разные последовательности', () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)())
  })

  it('выдаёт числа в диапазоне [0, 1)', () => {
    const random = createRandom(7)
    for (let i = 0; i < 1000; i += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('hashString', () => {
  it('стабилен и различает тексты', () => {
    expect(hashString('Успешный стартап')).toBe(hashString('Успешный стартап'))
    expect(hashString('Успешный стартап')).not.toBe(hashString('Успешный стартап!'))
  })

  it('возвращает неотрицательное 32-битное число', () => {
    for (const text of ['', 'a', 'длинный текст со всеми буквами ёЁ']) {
      const hash = hashString(text)
      expect(Number.isInteger(hash)).toBe(true)
      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThan(2 ** 32)
    }
  })
})
