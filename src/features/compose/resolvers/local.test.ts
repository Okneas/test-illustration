import { describe, expect, it } from 'vitest'
import { localResolver } from './local'

describe('localResolver', () => {
  it('подбирает объекты под метафору по тегам и смыслу', async () => {
    const ids = await localResolver('Успешный стартап')
    expect(ids).toEqual(expect.arrayContaining(['coin', 'lamp', 'phone']))
  })

  it('понимает словосочетания и падежи', async () => {
    const ids = await localResolver('Искусственный интеллект')
    expect(ids).toContain('lamp')
  })

  it('возвращает не больше четырёх объектов в первом варианте', async () => {
    const ids = await localResolver('деньги книга телефон лампа папка ручка музыка')
    expect(ids.length).toBeLessThanOrEqual(4)
  })

  it('даёт другие наборы в других вариантах', async () => {
    const sets = new Set<string>()
    for (const variant of [0, 1, 2, 3, 4, 5]) {
      sets.add([...(await localResolver('Бизнес', { variant }))].sort().join(','))
    }
    expect(sets.size).toBeGreaterThanOrEqual(3)
  })

  it('возвращает пустой список, если совпадений нет', async () => {
    expect(await localResolver('квантовая хромодинамика')).toEqual([])
  })
})
