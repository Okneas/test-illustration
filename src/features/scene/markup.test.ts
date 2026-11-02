import { describe, expect, it } from 'vitest'
import { decorTransform, objectTransform } from './markup'

describe('decorTransform', () => {
  it('на квадрате того же размера оставляет фон как есть', () => {
    expect(decorTransform({ width: 1000, height: 1000 }, { width: 1000, height: 1000 })).toBe('translate(0 0)')
  })

  it('растягивает меньший фон до покрытия и прижимает к правому нижнему углу', () => {
    // фон 500×500 на 1000×1000: масштаб 2, углы остаются углами
    expect(decorTransform({ width: 1000, height: 1000 }, { width: 500, height: 500 })).toBe('translate(0 0) scale(2)')
    // на 1200×630: масштаб по большей стороне (1,2), виден нижний фрагмент
    expect(decorTransform({ width: 1200, height: 630 }, { width: 1000, height: 1000 })).toBe(
      'translate(0 -570) scale(1.2)',
    )
  })
})

describe('objectTransform', () => {
  it('без поворота — только перенос', () => {
    expect(objectTransform({ x: 10, y: 20, rotation: 0 }, 100, 50)).toBe('translate(10 20)')
  })

  it('с поворотом — вокруг центра объекта', () => {
    expect(objectTransform({ x: 10, y: 20, rotation: 90 }, 100, 50)).toBe('translate(10 20) rotate(90 50 25)')
  })
})
