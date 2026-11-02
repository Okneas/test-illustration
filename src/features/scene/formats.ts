import type { Format } from './types'

/** Три формата из страницы «Примеры композиций». */
export const FORMATS = [
  { id: 'square', name: 'Квадрат 1000×1000', width: 1000, height: 1000 },
  { id: 'wide', name: 'Горизонтальный 1200×630', width: 1200, height: 630 },
  { id: 'tall', name: 'Вертикальный 800×1200', width: 800, height: 1200 },
] as const satisfies readonly Format[]

export const DEFAULT_FORMAT: Format = FORMATS[0]
