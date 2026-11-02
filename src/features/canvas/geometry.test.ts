import { describe, expect, it } from 'vitest'
import { screenToCanvas } from './geometry'

describe('screenToCanvas', () => {
  it('учитывает сдвиг и масштаб холста на экране', () => {
    // Холст 1000 единиц показан в 500 px (масштаб 0,5), его левый верхний угол на экране в (100, 40).
    const matrix = { a: 0.5, b: 0, c: 0, d: 0.5, e: 100, f: 40 }
    expect(screenToCanvas(matrix, 100, 40)).toEqual({ x: 0, y: 0 })
    expect(screenToCanvas(matrix, 350, 290)).toEqual({ x: 500, y: 500 })
    expect(screenToCanvas(matrix, 600, 540)).toEqual({ x: 1000, y: 1000 })
  })

  it('даёт отрицательные координаты за левым верхним краем', () => {
    expect(screenToCanvas({ a: 1, b: 0, c: 0, d: 1, e: 50, f: 50 }, 20, 10)).toEqual({ x: -30, y: -40 })
  })

  it('работает и для матрицы с поворотом', () => {
    // Поворот на 90°: экранный x идёт вниз по холсту.
    const matrix = { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 }
    const point = screenToCanvas(matrix, 0, 10)
    expect(point.x).toBeCloseTo(10)
    expect(point.y).toBeCloseTo(0)
  })
})
