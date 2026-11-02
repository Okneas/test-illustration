export type Point = { x: number; y: number }

/** Часть матрицы DOMMatrix, нужная для обратного пересчёта (то, что отдаёт `getScreenCTM()`). */
export type ScreenMatrix = { a: number; b: number; c: number; d: number; e: number; f: number }

/**
 * Точка экрана (clientX/clientY) → координаты холста. `matrix` — `svg.getScreenCTM()`:
 * она уже учитывает масштаб, сдвиг и поля вокруг холста.
 */
export function screenToCanvas(matrix: ScreenMatrix, clientX: number, clientY: number): Point {
  const { a, b, c, d, e, f } = matrix
  const determinant = a * d - b * c
  const dx = clientX - e
  const dy = clientY - f
  return {
    x: (d * dx - c * dy) / determinant,
    y: (a * dy - b * dx) / determinant,
  }
}
