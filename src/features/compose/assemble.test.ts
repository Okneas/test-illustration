import { describe, expect, it } from 'vitest'
import { FORMATS } from '@/features/scene/formats'
import { assembleScene, chooseStates, type AssemblyItem, type Measure } from './assemble'

const [square] = FORMATS
const measure: Measure = async () => ({ width: 300, height: 200 })

describe('chooseStates', () => {
  it('делает первые три объекта главными, остальные фоновыми', () => {
    const states = chooseStates(['book', 'phone', 'coin', 'lamp', 'pen'], 'L').map((item) => item.state)
    expect(states).toEqual(['main', 'main', 'main', 'background', 'background'])
  })

  it('ставит всем выбранный размер', () => {
    expect(chooseStates(['book', 'phone'], 'S').map((item) => item.size)).toEqual(['S', 'S'])
  })

  it('убирает повторы', () => {
    expect(chooseStates(['book', 'book', 'phone'], 'L').map((item) => item.objectId)).toEqual(['book', 'phone'])
  })

  it('пустой список даёт пустой результат', () => {
    expect(chooseStates([], 'L')).toEqual([])
  })
})

describe('assembleScene', () => {
  const items: AssemblyItem[] = [
    { objectId: 'book', state: 'main', size: 'L' },
    { objectId: 'lamp', state: 'background', size: 'L' },
    { objectId: 'phone', state: 'main', size: 'L' },
  ]

  it('кладёт фоновые объекты на нижние слои', async () => {
    let counter = 0
    const objects = await assembleScene({ items, format: square, mode: 'compact', measure, createId: () => `id${++counter}` })
    expect(objects.map((object) => object.objectId)).toEqual(['lamp', 'book', 'phone'])
    expect(objects.map((object) => object.state)).toEqual(['background', 'main', 'main'])
    expect(objects.map((object) => object.instanceId)).toEqual(['id1', 'id2', 'id3'])
  })

  it('внутри группы кладёт крупные объекты ниже мелких', async () => {
    const sizes = { lamp: 1000, book: 600, coin: 100 }
    const bySize: Measure = async ({ objectId }) => ({
      width: sizes[objectId as keyof typeof sizes] ?? 100,
      height: sizes[objectId as keyof typeof sizes] ?? 100,
    })
    const objects = await assembleScene({
      items: [
        { objectId: 'coin', state: 'main', size: 'L' },
        { objectId: 'lamp', state: 'main', size: 'L' },
        { objectId: 'book', state: 'main', size: 'L' },
      ],
      format: square,
      mode: 'compact',
      measure: bySize,
    })
    expect(objects.map((object) => object.objectId)).toEqual(['lamp', 'book', 'coin'])
  })

  it('сохраняет размер каждого объекта и измеряет его по этому размеру', async () => {
    const measured: string[] = []
    const objects = await assembleScene({
      items: [
        { objectId: 'book', state: 'main', size: 'S' },
        { objectId: 'phone', state: 'main', size: 'L' },
      ],
      format: square,
      mode: 'compact',
      measure: async ({ objectId, size }) => {
        measured.push(`${objectId}:${size}`)
        return { width: 300, height: 200 }
      },
    })
    expect(measured.sort()).toEqual(['book:S', 'phone:L'])
    expect(Object.fromEntries(objects.map((object) => [object.objectId, object.size]))).toEqual({ book: 'S', phone: 'L' })
  })

  it('ставит объекты без поворота и в позиции из раскладки', async () => {
    const objects = await assembleScene({ items, format: square, mode: 'compact', measure })
    expect(objects.every((object) => object.rotation === 0)).toBe(true)
    expect(new Set(objects.map((object) => `${object.x}:${object.y}`)).size).toBe(3)
  })

  it('разные seed дают разные раскладки', async () => {
    const a = await assembleScene({ items, format: square, mode: 'offset', seed: 1, measure })
    const b = await assembleScene({ items, format: square, mode: 'offset', seed: 2, measure })
    expect(a.map(({ x, y }) => [x, y])).not.toEqual(b.map(({ x, y }) => [x, y]))
  })

  it('возвращает пустую композицию без объектов', async () => {
    expect(await assembleScene({ items: [], format: square, mode: 'compact', measure })).toEqual([])
  })
})
