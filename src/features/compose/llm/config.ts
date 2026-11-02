import { getProvider, type ProviderPreset } from './providers'

/** То, что пользователь ввёл в форме подключения LLM. */
export type LlmDraft = {
  providerId: string
  model: string
  baseUrl: string
  apiKey: string
}

/** Проверенные, готовые к запросу настройки. */
export type LlmConfig = {
  provider: ProviderPreset
  apiKey: string
  model: string
  /** Без завершающего слэша. */
  baseUrl: string
}

export type ConfigCheck =
  /** LLM не включена: ключа нет. Это не ошибка, работает локальный подбор. */
  | { status: 'off' }
  /** Что-то начали вводить, но не хватает данных. */
  | { status: 'incomplete'; reason: string }
  | { status: 'ready'; config: LlmConfig }

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function parseBaseUrl(value: string): { url: string } | { error: string } {
  const trimmed = value.trim()
  if (!trimmed) return { error: 'Укажите адрес API' }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { error: 'Адрес API записан неверно: нужен полный адрес вида https://…' }
  }
  // Ключ уходит на этот адрес, поэтому по открытому http его не отправляем (кроме локальных серверов).
  const secure = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && LOCAL_HOSTS.has(parsed.hostname))
  if (!secure) return { error: 'Адрес должен начинаться с https:// (http разрешён только для localhost)' }
  return { url: trimmed.replace(/\/+$/, '') }
}

type CheckOptions = {
  /** Для загрузки списка моделей название модели ещё не нужно. */
  needModel?: boolean
}

/**
 * Решает, можно ли обращаться к LLM. Нет ключа у провайдера, которому он нужен, — значит LLM
 * просто выключена (`off`); начатая, но неполная настройка — `incomplete` с понятной причиной.
 */
export function checkLlmConfig(draft: LlmDraft, { needModel = true }: CheckOptions = {}): ConfigCheck {
  const provider = getProvider(draft.providerId)
  if (!provider) return { status: 'off' }

  const apiKey = draft.apiKey.trim()
  const model = draft.model.trim()
  if (provider.needsKey && !apiKey) return { status: 'off' }
  // Локальный сервер без ключа «включается» выбором модели. Исключение — загрузка списка моделей:
  // выбрать модель можно только после неё.
  if (needModel && !provider.needsKey && !apiKey && !model) return { status: 'off' }

  let baseUrl = provider.baseUrl
  if (provider.editableUrl) {
    const parsed = parseBaseUrl(draft.baseUrl)
    if ('error' in parsed) return { status: 'incomplete', reason: parsed.error }
    baseUrl = parsed.url
  }
  if (needModel && !model) return { status: 'incomplete', reason: 'Укажите модель или загрузите их список' }

  return { status: 'ready', config: { provider, apiKey, model, baseUrl } }
}

/** Короткая подпись для интерфейса: «OpenAI · gpt-4o-mini». */
export function describeConfig(config: LlmConfig): string {
  return `${config.provider.name} · ${config.model}`
}
