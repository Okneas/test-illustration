import type { LibraryObjectId } from '@/features/library/manifest'

export type ResolveContext = {
  /** Номер варианта: 0 — самый вероятный набор, остальные дают другие, но тоже подходящие. */
  variant?: number
}

/** Сценарий 1: по метафоре или заголовку возвращает id подходящих объектов, лучшие первыми. */
export type MetaphorResolver = (text: string, context?: ResolveContext) => Promise<LibraryObjectId[]>
