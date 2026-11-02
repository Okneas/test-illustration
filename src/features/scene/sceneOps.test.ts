import { describe, expect, it } from 'vitest'
import {
  addObject,
  arrayIndexForDrop,
  DUPLICATE_OFFSET,
  duplicateObject,
  moveLayer,
  moveLayerTo,
  normalizeRotation,
  removeObject,
  updateObject,
} from './sceneOps'
import type { CanvasObject } from './types'

const make = (instanceId: string, patch: Partial<CanvasObject> = {}): CanvasObject => ({
  instanceId,
  objectId: 'book',
  x: 0,
  y: 0,
  rotation: 0,
  state: 'main',
  size: 'L',
  ...patch,
})
const order = (objects: readonly CanvasObject[]) => objects.map((object) => object.instanceId).join('')

describe('normalizeRotation', () => {
  it.each([
    [0, 0],
    [360, 0],
    [370, 10],
    [-10, 350],
    [-370, 350],
    [Number.NaN, 0],
  ])('%d° → %d°', (input, expected) => {
    expect(normalizeRotation(input)).toBe(expected)
  })
})

describe('addObject / removeObject', () => {
  it('добавляет наверх и не меняет исходный массив', () => {
    const before = [make('a')]
    const after = addObject(before, make('b'))
    expect(order(after)).toBe('ab')
    expect(order(before)).toBe('a')
  })

  it('удаляет по id', () => {
    expect(order(removeObject([make('a'), make('b'), make('c')], 'b'))).toBe('ac')
  })

  it('неизвестный id ничего не удаляет', () => {
    expect(order(removeObject([make('a')], 'zzz'))).toBe('a')
  })
})

describe('updateObject', () => {
  it('меняет только указанный объект', () => {
    const result = updateObject([make('a'), make('b')], 'b', { x: 50, state: 'background' })
    expect(result[0]).toEqual(make('a'))
    expect(result[1]).toEqual(make('b', { x: 50, state: 'background' }))
  })

  it('приводит поворот к диапазону 0–360', () => {
    expect(updateObject([make('a')], 'a', { rotation: -90 })[0]?.rotation).toBe(270)
  })

  it('меняет размер одного объекта и не трогает остальные', () => {
    const result = updateObject([make('a'), make('b')], 'b', { size: 'S' })
    expect(result.map((object) => object.size)).toEqual(['L', 'S'])
  })
})

describe('duplicateObject', () => {
  it('вставляет копию сразу над оригиналом и сдвигает её', () => {
    const result = duplicateObject([make('a', { x: 5, y: 7 }), make('b')], 'a', 'a2')
    expect(order(result)).toBe('aa2b')
    expect(result[1]).toMatchObject({ instanceId: 'a2', x: 5 + DUPLICATE_OFFSET, y: 7 + DUPLICATE_OFFSET })
  })

  it('копирует поворот, состояние и размер', () => {
    const [, copy] = duplicateObject([make('a', { rotation: 30, state: 'background', size: 'S' })], 'a', 'a2')
    expect(copy).toMatchObject({ rotation: 30, state: 'background', size: 'S' })
  })

  it('неизвестный id ничего не добавляет', () => {
    expect(order(duplicateObject([make('a')], 'zzz', 'new'))).toBe('a')
  })
})

describe('moveLayerTo', () => {
  const stack = () => [make('a'), make('b'), make('c'), make('d')]

  it.each([
    ['a', 3, 'bcda'],
    ['d', 0, 'dabc'],
    ['b', 2, 'acbd'],
    ['c', 1, 'acbd'],
  ] as const)('%s на место %d → %s', (id, to, expected) => {
    expect(order(moveLayerTo(stack(), id, to))).toBe(expected)
  })

  it('ограничивает индекс краями стопки', () => {
    expect(order(moveLayerTo(stack(), 'b', 99))).toBe('acdb')
    expect(order(moveLayerTo(stack(), 'c', -5))).toBe('cabd')
  })

  it('на своё же место и для неизвестного id ничего не меняет', () => {
    expect(order(moveLayerTo(stack(), 'b', 1))).toBe('abcd')
    expect(order(moveLayerTo(stack(), 'zzz', 0))).toBe('abcd')
  })
})

describe('arrayIndexForDrop', () => {
  // Массив [a, b, c, d]; список показан сверху вниз: строки 0..3 это d, c, b, a.
  // Индекс в массиве = 3 - номер строки: a=0, b=1, c=2, d=3.
  it.each([
    // [строка слоя, щель, ожидаемый индекс в массиве]
    [0, 4, 0], // d отпустили под последней строкой → самый нижний слой
    [3, 0, 3], // a отпустили над первой строкой → самый верхний слой
    [1, 0, 3], // c отпустили над первой строкой → вверх стопки
    [1, 3, 1], // c в щель между b и a → строки d, b, c, a → c на индексе 1
    [2, 1, 2], // b в щель между d и c → строки d, b, c, a → b поднялась на индекс 2
    [2, 2, 1], // b в щель прямо над собой → осталась на месте (индекс 1)
    [2, 3, 1], // b в щель прямо под собой → тоже на месте
  ])('строка %d, щель %d → индекс %d', (from, slot, expected) => {
    expect(arrayIndexForDrop(4, from, slot)).toBe(expected)
  })

  it('вместе с moveLayerTo даёт тот порядок, который человек видит в списке', () => {
    const objects = [make('a'), make('b'), make('c'), make('d')]
    // Верхний слой d (строка 0) отпускаем в щель между b и a (щель 3): сверху вниз станет c, b, d, a.
    const to = arrayIndexForDrop(objects.length, 0, 3)
    const result = moveLayerTo(objects, 'd', to)
    expect(order(result)).toBe('adbc') // массив снизу вверх: a, d, b, c
    expect(order([...result].reverse())).toBe('cbda') // как в списке сверху вниз
  })
})

describe('moveLayer', () => {
  const stack = () => [make('a'), make('b'), make('c'), make('d')]

  it.each([
    ['b', 'forward', 'acbd'],
    ['b', 'backward', 'bacd'],
    ['b', 'front', 'acdb'],
    ['c', 'back', 'cabd'],
  ] as const)('%s %s → %s', (id, move, expected) => {
    expect(order(moveLayer(stack(), id, move))).toBe(expected)
  })

  it('на краях стопки ничего не меняет', () => {
    expect(order(moveLayer(stack(), 'd', 'forward'))).toBe('abcd')
    expect(order(moveLayer(stack(), 'a', 'backward'))).toBe('abcd')
    expect(order(moveLayer(stack(), 'd', 'front'))).toBe('abcd')
  })

  it('неизвестный id ничего не меняет', () => {
    expect(order(moveLayer(stack(), 'zzz', 'front'))).toBe('abcd')
  })
})
