import type { LlmConfig } from './config'
import { fetchJson, isRecord, type HttpOptions } from './http'

const MAX_MODELS = 500

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, MAX_MODELS)
}

/** `{ data: [{ id }] }` (OpenAI, Groq, OpenRouter, Ollama…) или просто массив. */
export function readOpenAiModels(data: unknown): string[] {
  const list = isRecord(data) && Array.isArray(data.data) ? (data.data as unknown[]) : Array.isArray(data) ? data : []
  return unique(list.flatMap((item) => (isRecord(item) && typeof item.id === 'string' ? [item.id] : [])))
}

/** Gemini: только модели, умеющие `generateContent`; префикс `models/` убираем. */
export function readGeminiModels(data: unknown): string[] {
  const list = isRecord(data) && Array.isArray(data.models) ? (data.models as unknown[]) : []
  return unique(
    list.flatMap((item) => {
      if (!isRecord(item) || typeof item.name !== 'string') return []
      const methods = Array.isArray(item.supportedGenerationMethods) ? (item.supportedGenerationMethods as unknown[]) : []
      return methods.includes('generateContent') ? [item.name.replace(/^models\//, '')] : []
    }),
  )
}

async function listAnthropicModels(config: LlmConfig): Promise<string[]> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true })
  try {
    const ids: string[] = []
    for await (const model of client.models.list()) ids.push(model.id)
    return unique(ids)
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new Error('неверный ключ API', { cause: error })
    if (error instanceof Anthropic.APIConnectionError) {
      throw new Error('нет соединения с api.anthropic.com', { cause: error })
    }
    throw error
  }
}

/**
 * Загружает список моделей у провайдера. Заодно это проверка ключа: список отдаётся только тем, у кого
 * ключ рабочий. Названия отдаются как есть, ничего не отбрасывается, кроме нетекстовых моделей Gemini.
 */
export async function listModels(config: LlmConfig, options: HttpOptions = {}): Promise<string[]> {
  const withSecret = { ...options, secrets: [...(options.secrets ?? []), config.apiKey] }
  let models: string[]
  switch (config.provider.kind) {
    case 'anthropic':
      models = await listAnthropicModels(config)
      break
    case 'gemini':
      models = readGeminiModels(
        await fetchJson(
          `${config.baseUrl}/v1beta/models?pageSize=1000`,
          { headers: { 'x-goog-api-key': config.apiKey } },
          withSecret,
        ),
      )
      break
    case 'openai':
      models = readOpenAiModels(
        await fetchJson(
          `${config.baseUrl}/models`,
          { headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {} },
          withSecret,
        ),
      )
      break
  }
  if (models.length === 0) throw new Error('сервис не вернул список моделей')
  return models
}
