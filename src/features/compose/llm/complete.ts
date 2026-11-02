import type { Complete } from '../resolvers/llm'
import type { LlmConfig } from './config'
import { fetchJson, isRecord, type HttpOptions } from './http'

/** Модели Claude, принимающие `effort`; на остальных (старых) параметр вызвал бы ошибку 400. */
const SUPPORTS_EFFORT = /^claude-(opus-(5|4-[5-8])|sonnet-(5|4-6)|fable|mythos|haiku-5)/

/** Запас на ответ: у моделей с рассуждениями часть лимита уходит на размышления. */
const ANTHROPIC_MAX_TOKENS = 8192

/** Текст ответа OpenAI-совместимого сервиса: `choices[0].message.content` (строка или части). */
export function readOpenAiText(data: unknown): string {
  const choice = isRecord(data) && Array.isArray(data.choices) ? (data.choices[0] as unknown) : undefined
  const message = isRecord(choice) ? choice.message : undefined
  const content = isRecord(message) ? message.content : undefined
  if (typeof content === 'string' && content.trim()) return content
  if (Array.isArray(content)) {
    const text = (content as unknown[])
      .flatMap((part) => (isRecord(part) && typeof part.text === 'string' ? [part.text] : []))
      .join('')
    if (text.trim()) return text
  }
  throw new Error('сервис вернул ответ без текста')
}

/** Текст ответа Gemini: части `candidates[0].content.parts[].text`. */
export function readGeminiText(data: unknown): string {
  const candidate = isRecord(data) && Array.isArray(data.candidates) ? (data.candidates[0] as unknown) : undefined
  const content = isRecord(candidate) ? candidate.content : undefined
  const parts = isRecord(content) && Array.isArray(content.parts) ? (content.parts as unknown[]) : []
  const text = parts.flatMap((part) => (isRecord(part) && typeof part.text === 'string' ? [part.text] : [])).join('')
  if (text.trim()) return text
  const blocked = isRecord(data) && isRecord(data.promptFeedback) ? data.promptFeedback.blockReason : undefined
  throw new Error(typeof blocked === 'string' ? `запрос заблокирован сервисом (${blocked})` : 'сервис вернул ответ без текста')
}

function openAiComplete(config: LlmConfig, options: HttpOptions): Complete {
  const url = `${config.baseUrl}/chat/completions`
  return async (system, user) => {
    const data = await fetchJson(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Локальным серверам ключ не нужен: тогда заголовок не отправляется вовсе.
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      },
      options,
    )
    return readOpenAiText(data)
  }
}

function geminiComplete(config: LlmConfig, options: HttpOptions): Complete {
  const model = encodeURIComponent(config.model.replace(/^models\//, ''))
  const url = `${config.baseUrl}/v1beta/models/${model}:generateContent`
  return async (system, user) => {
    const data = await fetchJson(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
        }),
      },
      options,
    )
    return readGeminiText(data)
  }
}

/**
 * Claude через официальный SDK. Он подгружается лениво: тем, кто не включает LLM, или выбрал
 * другого провайдера, SDK в загрузку не попадает.
 */
function anthropicComplete(config: LlmConfig): Complete {
  return async (system, user) => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true })
    try {
      const response = await client.messages.create({
        model: config.model,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        ...(SUPPORTS_EFFORT.test(config.model) ? { output_config: { effort: 'low' as const } } : {}),
        system,
        messages: [{ role: 'user', content: user }],
      })
      if (response.stop_reason === 'refusal') {
        throw new Error('модель отказалась отвечать на этот запрос')
      }
      return response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('')
    } catch (error) {
      // От частного к общему; сырое тело ответа API пользователю не показываем.
      if (error instanceof Anthropic.AuthenticationError) throw new Error('неверный ключ API', { cause: error })
      if (error instanceof Anthropic.NotFoundError) {
        throw new Error('модель не найдена: проверьте её название', { cause: error })
      }
      if (error instanceof Anthropic.RateLimitError) throw new Error('превышен лимит запросов', { cause: error })
      if (error instanceof Anthropic.APIConnectionError) {
        throw new Error('нет соединения с api.anthropic.com', { cause: error })
      }
      if (error instanceof Anthropic.APIError) {
        throw new Error(`ошибка API ${error.status ?? ''}`.trim(), { cause: error })
      }
      throw error
    }
  }
}

/** Функция запроса к LLM для выбранного провайдера. */
export function createComplete(config: LlmConfig, options: HttpOptions = {}): Complete {
  const withSecret = { ...options, secrets: [...(options.secrets ?? []), config.apiKey] }
  switch (config.provider.kind) {
    case 'openai':
      return openAiComplete(config, withSecret)
    case 'gemini':
      return geminiComplete(config, withSecret)
    case 'anthropic':
      return anthropicComplete(config)
  }
}
