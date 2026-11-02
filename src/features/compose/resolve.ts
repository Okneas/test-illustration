import type { LibraryObjectId } from '@/features/library/manifest'
import { createComplete } from './llm/complete'
import { describeConfig, type LlmConfig } from './llm/config'
import { createLlmResolver } from './resolvers/llm'
import { localResolver } from './resolvers/local'
import type { MetaphorResolver } from './types'
import { pickUniversal } from './variation'

export type ResolveOutcome = {
  ids: LibraryObjectId[]
  source: 'llm' | 'local'
  /** Какая модель подобрала объекты («OpenAI · gpt-4o-mini»); только для source = 'llm'. */
  via?: string
  /** Что пошло не так при обращении к LLM или чем пришлось заменить подбор; показывается пользователю. */
  notice?: string
}

type ResolveOptions = {
  /** Проверенные настройки LLM; без них сразу работает локальный подбор. */
  config?: LlmConfig | null
  /** Номер варианта: 0 — самый вероятный набор, остальные дают другие. */
  variant?: number
  /** Подмена резолверов для тестов. */
  llm?: MetaphorResolver
  local?: MetaphorResolver
}

function describeError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'неизвестная ошибка'
}

/**
 * Сценарий 1. Если LLM подключена, спрашиваем её; при ошибке, отказе или пустом ответе подбираем
 * локально и говорим об этом. Если и локально ничего не нашлось, берём универсальный набор и тоже
 * предупреждаем: подборка не относится к теме напрямую.
 */
export async function resolveMetaphor(text: string, options: ResolveOptions = {}): Promise<ResolveOutcome> {
  const { config, variant = 0, local = localResolver } = options
  const llm = options.llm ?? (config ? createLlmResolver(createComplete(config)) : undefined)
  const context = { variant }

  let llmNotice: string | undefined
  if (llm) {
    try {
      const ids = await llm(text, context)
      if (ids.length > 0) return { ids, source: 'llm', via: config ? describeConfig(config) : undefined }
      llmNotice = 'LLM не подобрала объекты, использован локальный подбор.'
    } catch (error) {
      llmNotice = `LLM недоступна (${describeError(error)}), использован локальный подбор.`
    }
  }

  const ids = await local(text, context)
  if (ids.length > 0) return { ids, source: 'local', notice: llmNotice }

  const universal = pickUniversal(text, variant)
  const notice = 'Слова из запроса не нашлись в библиотеке, подобраны универсальные объекты.'
  return { ids: universal, source: 'local', notice: llmNotice ? `${llmNotice} ${notice}` : notice }
}
