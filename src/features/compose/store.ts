import { create } from 'zustand'
import type { LibraryObjectId } from '@/features/library/manifest'
import type { LayoutMode } from './autoLayout'

/** Итог последней сборки по метафоре: показывается пользователю и нужен для «Подобрать заново». */
export type AssemblySummary = {
  /** Исходный запрос. */
  text: string
  /** Подобранные объекты, лучшие первыми. */
  ids: LibraryObjectId[]
  /** Названия объектов для показа. */
  names: string[]
  source: 'llm' | 'local'
  /** Какая модель подобрала («OpenAI · gpt-4o-mini»), если source = 'llm'. */
  via?: string
  notice?: string
  /** Номер варианта: «Подобрать заново» увеличивает его. */
  variant: number
}

type ComposeStore = {
  layoutMode: LayoutMode
  /** Номер варианта раскладки: «Другой вариант» увеличивает его. */
  seed: number
  /** Случайные размеры и состояния при автосборке по метафоре. */
  variety: boolean
  lastAssembly: AssemblySummary | null
  setLayoutMode: (mode: LayoutMode) => void
  setVariety: (variety: boolean) => void
  setLastAssembly: (summary: AssemblySummary | null) => void
  nextSeed: () => number
}

export const useComposeStore = create<ComposeStore>()((set, get) => ({
  layoutMode: 'compact',
  seed: 0,
  variety: true,
  lastAssembly: null,
  setLayoutMode: (layoutMode) => set({ layoutMode, seed: 0 }),
  setVariety: (variety) => set({ variety }),
  setLastAssembly: (lastAssembly) => set({ lastAssembly }),
  nextSeed: () => {
    const seed = get().seed + 1
    set({ seed })
    return seed
  },
}))

export const LAYOUT_MODE_LABELS: Record<LayoutMode, string> = {
  compact: 'Собранно',
  offset: 'Со смещением',
  headline: 'Под заголовок',
}
