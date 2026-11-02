import { describe, expect, it } from 'vitest'
import { COMPANIONS } from '@/features/library/concepts'
import { isLibraryObjectId, LIBRARY_OBJECTS } from '@/features/library/manifest'
import { searchObjects } from '@/features/library/search'
import { chooseStates } from './assemble'
import { DEFAULT_COUNT, pickForMetaphor, pickUniversal, planAssembly } from './variation'

const QUERIES = [
  'Успешный стартап',
  'Искусственный интеллект',
  'Оплата в мобильном приложении',
  'Музыка и учёба',
  'Подарок маме на 8 марта',
  'Бизнес',
  'Здоровье',
  'телефон',
  'книга',
]

describe('pickForMetaphor', () => {
  it('для одного запроса и варианта всегда даёт одно и то же', () => {
    for (const query of QUERIES) {
      for (const variant of [0, 1, 2, 3]) {
        expect(pickForMetaphor(query, variant)).toEqual(pickForMetaphor(query, variant))
      }
    }
  })

  it('в варианте 0 берёт четыре объекта, а в остальных от трёх до пяти', () => {
    for (const query of QUERIES) {
      expect(pickForMetaphor(query, 0), query).toHaveLength(DEFAULT_COUNT)
      for (const variant of [1, 2, 3, 4, 5, 6]) {
        const count = pickForMetaphor(query, variant).length
        expect(count, `${query} v${variant}`).toBeGreaterThanOrEqual(3)
        expect(count, `${query} v${variant}`).toBeLessThanOrEqual(5)
      }
    }
  })

  it('всегда начинает с самого подходящего объекта и не повторяется', () => {
    for (const query of QUERIES) {
      const best = searchObjects(query)[0]?.object.id
      for (const variant of [0, 1, 2, 3]) {
        const ids = pickForMetaphor(query, variant)
        expect(ids[0], `${query} v${variant}`).toBe(best)
        expect(new Set(ids).size).toBe(ids.length)
        expect(ids.every(isLibraryObjectId)).toBe(true)
      }
    }
  })

  it('даёт разные наборы в разных вариантах', () => {
    for (const query of ['Успешный стартап', 'Оплата в мобильном приложении', 'Бизнес', 'Подарок маме на 8 марта']) {
      const sets = new Set([0, 1, 2, 3, 4, 5].map((variant) => [...pickForMetaphor(query, variant)].sort().join(',')))
      expect(sets.size, query).toBeGreaterThanOrEqual(3)
    }
  })

  it('«успешный стартап» включает монету, лампу и телефон', () => {
    expect(pickForMetaphor('Успешный стартап', 0)).toEqual(expect.arrayContaining(['coin', 'lamp', 'phone']))
  })

  it('добирает логичных спутников, если совпал один объект', () => {
    const ids = pickForMetaphor('телефон', 0)
    expect(ids[0]).toBe('phone')
    expect(ids.length).toBeGreaterThanOrEqual(3)
    const companions: readonly string[] = COMPANIONS.phone
    for (const id of ids.slice(1)) {
      // каждый следующий объект либо тоже нашёлся по смыслу, либо входит в спутники телефона
      const matched = searchObjects('телефон').some((result) => result.object.id === id)
      expect(matched || companions.includes(id), id).toBe(true)
    }
  })

  it('возвращает пусто, если ни одно слово не нашлось', () => {
    expect(pickForMetaphor('квантовая хромодинамика')).toEqual([])
    expect(pickForMetaphor('   ')).toEqual([])
  })
})

describe('pickUniversal', () => {
  it('даёт четыре разных существующих объекта', () => {
    const ids = pickUniversal('квантовая хромодинамика')
    expect(ids).toHaveLength(DEFAULT_COUNT)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(isLibraryObjectId)).toBe(true)
  })

  it('зависит от текста и варианта, но воспроизводим', () => {
    expect(pickUniversal('альфа', 0)).toEqual(pickUniversal('альфа', 0))
    const sets = new Set(
      ['альфа', 'бета', 'гамма', 'дельта', 'эпсилон'].flatMap((text) => [0, 1].map((v) => pickUniversal(text, v).join(','))),
    )
    expect(sets.size).toBeGreaterThan(3)
  })
})

describe('planAssembly', () => {
  const ids = LIBRARY_OBJECTS.slice(0, 5).map((object) => object.id)

  it('без разнообразия: как раньше — три главных, остальные фоновые, один размер', () => {
    expect(planAssembly(ids, { size: 'S', variety: false })).toEqual(chooseStates(ids, 'S'))
  })

  it('убирает повторы и сохраняет порядок', () => {
    const items = planAssembly(['book', 'coin', 'book', 'pen'], { size: 'L', variety: true, salt: 'x' })
    expect(items.map((item) => item.objectId)).toEqual(['book', 'coin', 'pen'])
  })

  it('с разнообразием воспроизводим для одного запроса и варианта', () => {
    expect(planAssembly(ids, { size: 'L', variety: true, variant: 2, salt: 'тема' })).toEqual(
      planAssembly(ids, { size: 'L', variety: true, variant: 2, salt: 'тема' }),
    )
  })

  it('с разнообразием сохраняет разумную композицию при любых зёрнах', () => {
    for (const salt of QUERIES) {
      for (const variant of [0, 1, 2, 3, 4, 5, 6, 7]) {
        for (const count of [1, 2, 3, 4, 5]) {
          const items = planAssembly(ids.slice(0, count), { size: 'L', variety: true, variant, salt })
          const mains = items.filter((item) => item.state === 'main').length
          expect(items[0]?.state, `${salt} v${variant}`).toBe('main') // самый подходящий всегда главный
          expect(mains, `${salt} v${variant} n${count}`).toBeGreaterThanOrEqual(Math.min(2, count))
          expect(items.every((item) => item.size === 'S' || item.size === 'L')).toBe(true)
        }
      }
    }
  })

  it('на разных зёрнах встречаются и оба размера, и оба состояния', () => {
    const items = QUERIES.flatMap((salt) =>
      [0, 1, 2, 3].flatMap((variant) => planAssembly(ids, { size: 'L', variety: true, variant, salt })),
    )
    expect(new Set(items.map((item) => item.size))).toEqual(new Set(['S', 'L']))
    expect(new Set(items.map((item) => item.state))).toEqual(new Set(['main', 'background']))
  })

  it('чаще оставляет размер из настроек, чем меняет его', () => {
    const items = QUERIES.flatMap((salt) =>
      [0, 1, 2, 3, 4, 5].flatMap((variant) => planAssembly(ids, { size: 'L', variety: true, variant, salt })),
    )
    const kept = items.filter((item) => item.size === 'L').length
    expect(kept).toBeGreaterThan(items.length / 2)
  })

  it('отталкивается от размера из настроек', () => {
    const items = QUERIES.flatMap((salt) => planAssembly(ids, { size: 'S', variety: true, variant: 1, salt }))
    expect(items.filter((item) => item.size === 'S').length).toBeGreaterThan(items.length / 2)
  })
})
