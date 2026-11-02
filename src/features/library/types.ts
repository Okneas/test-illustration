export const SIZES = ['S', 'L'] as const
export type Size = (typeof SIZES)[number]

export const OBJECT_STATES = ['main', 'background'] as const
export type ObjectState = (typeof OBJECT_STATES)[number]

/** Номер фоновой схемы в Figma: у каждой из трёх схем свой рисунок «Фона». */
export type SchemeIndex = 1 | 2 | 3

export type LibraryObject = {
  id: string
  /** Название для интерфейса и поиска. */
  name: string
  /** Слова для поиска и подбора по метафоре (рус. и англ.), в нижнем регистре. */
  tags: readonly string[]
}
