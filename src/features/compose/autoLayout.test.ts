import { describe, expect, it } from 'vitest'
import { FORMATS } from '@/features/scene/formats'
import { HEADLINE_SPACE, layoutComposition, LAYOUT_MODES, type LayoutItem } from './autoLayout'

const [square, wide, tall] = FORMATS
const item = (width = 300, height = 200): LayoutItem => ({ width, height })
const center = (point: { x: number; y: number }, it: LayoutItem) => ({ x: point.x + it.width / 2, y: point.y + it.height / 2 })

describe('layoutComposition', () => {
  it('возвращает пустой список для пустого входа', () => {
    expect(layoutComposition([], square, 'compact')).toEqual([])
  })

  it('ставит единственный объект в центр формата', () => {
    const one = item(400, 300)
    const [point] = layoutComposition([one], wide, 'compact')
    expect(point && center(point, one)).toEqual({ x: 600, y: 315 })
  })

  it('даёт столько позиций, сколько объектов', () => {
    for (const mode of LAYOUT_MODES) {
      for (const count of [1, 2, 3, 4, 5, 6]) {
        expect(layoutComposition(Array.from({ length: count }, () => item()), square, mode)).toHaveLength(count)
      }
    }
  })

  it('держит центры объектов внутри холста во всех форматах и режимах', () => {
    const items = [item(900, 700), item(800, 450), item(500, 300), item(250, 150), item(600, 600)]
    for (const format of FORMATS) {
      for (const mode of LAYOUT_MODES) {
        layoutComposition(items, format, mode).forEach((point, i) => {
          const c = center(point, items[i] ?? item())
          expect(c.x).toBeGreaterThanOrEqual(0)
          expect(c.x).toBeLessThanOrEqual(format.width)
          expect(c.y).toBeGreaterThanOrEqual(0)
          expect(c.y).toBeLessThanOrEqual(format.height)
        })
      }
    }
  })

  it('режим «под заголовок» оставляет левую часть свободной', () => {
    const items = [item(), item(), item(), item()]
    for (const format of [square, wide, tall]) {
      layoutComposition(items, format, 'headline').forEach((point, i) => {
        expect(center(point, items[i] ?? item()).x).toBeGreaterThanOrEqual(format.width * HEADLINE_SPACE)
      })
    }
  })

  it('«собранно» ближе к центру, чем обычная сетка', () => {
    const items = [item(), item(), item(), item()]
    const spread = (points: { x: number; y: number }[]) => Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x))
    expect(spread(layoutComposition(items, square, 'compact'))).toBeLessThan(spread(layoutComposition(items, square, 'offset')))
  })

  it('«со смещением» сдвигает соседние ряды в разные стороны', () => {
    // 4 объекта на квадрате — сетка 2×2 с ячейкой 500 px; ряды расходятся на 2 × 20% ячейки.
    const items = [item(), item(), item(), item()]
    const [firstRowLeft, , secondRowLeft] = layoutComposition(items, square, 'offset')
    expect(firstRowLeft && secondRowLeft && secondRowLeft.x - firstRowLeft.x).toBe(200)
  })

  it('детерминирован: один seed — один результат, другой seed — другой вариант', () => {
    const items = [item(), item(), item()]
    expect(layoutComposition(items, square, 'offset', 7)).toEqual(layoutComposition(items, square, 'offset', 7))
    expect(layoutComposition(items, square, 'offset', 7)).not.toEqual(layoutComposition(items, square, 'offset', 8))
    expect(layoutComposition(items, square, 'offset', 7)).not.toEqual(layoutComposition(items, square, 'offset', 0))
  })

  it('не прячет мелкий объект целиком за крупным', () => {
    // Лампа L почти с весь холст и монета: «тела» (60% габарита) не должны пересекаться.
    const lamp = { width: 946, height: 1129 }
    const coin = { width: 287, height: 189 }
    for (const mode of LAYOUT_MODES) {
      const [a, b] = layoutComposition([lamp, coin], square, mode)
      if (!a || !b) throw new Error('нет позиций')
      const ca = center(a, lamp)
      const cb = center(b, coin)
      const overlapX = ((lamp.width + coin.width) * 0.6) / 2 - Math.abs(ca.x - cb.x)
      const overlapY = ((lamp.height + coin.height) * 0.6) / 2 - Math.abs(ca.y - cb.y)
      expect(overlapX <= 1 || overlapY <= 1).toBe(true)
    }
  })

  it('разводит несколько небольших объектов без наложения тел', () => {
    const items = [item(300, 200), item(300, 200), item(300, 200), item(300, 200), item(300, 200)]
    for (const format of FORMATS) {
      const points = layoutComposition(items, format, 'compact')
      points.forEach((pa, i) => {
        points.slice(i + 1).forEach((pb) => {
          const dx = Math.abs(pa.x - pb.x)
          const dy = Math.abs(pa.y - pb.y)
          expect(dx >= 300 * 0.6 - 1 || dy >= 200 * 0.6 - 1).toBe(true)
        })
      })
    }
  })

  it('центрирует неполный последний ряд', () => {
    const items = [item(100, 100), item(100, 100), item(100, 100)]
    const [a, b, c] = layoutComposition(items, { width: 1000, height: 1000 }, 'offset')
    // 3 объекта → 2 колонки: во втором ряду один объект и он стоит по центру области, а не слева.
    expect(a && b && c && c.x + 50 > a.x + 50 && c.x + 50 < b.x + 50).toBe(true)
  })
})
