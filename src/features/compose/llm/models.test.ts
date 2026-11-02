import { describe, expect, it, vi } from 'vitest'
import { checkLlmConfig, type LlmConfig } from './config'
import type { FetchLike } from './http'
import { listModels, readGeminiModels, readOpenAiModels } from './models'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function configFor(providerId: string, patch: { baseUrl?: string; apiKey?: string } = {}): LlmConfig {
  const result = checkLlmConfig(
    { providerId, model: '', baseUrl: patch.baseUrl ?? 'https://api.openai.com/v1', apiKey: patch.apiKey ?? 'sk-test-key' },
    { needModel: false },
  )
  if (result.status !== 'ready') throw new Error('настройки для теста не готовы')
  return result.config
}

describe('listModels', () => {
  it('у OpenAI-совместимого сервиса читает data[].id, сортирует и убирает повторы', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ data: [{ id: 'b-model' }, { id: 'a-model' }, { id: 'b-model' }, {}] }))
    expect(await listModels(configFor('openai'), { fetchImpl })).toEqual(['a-model', 'b-model'])
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/models')
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer sk-test-key' })
  })

  it('у Gemini оставляет только модели с generateContent и убирает префикс models/', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(
      json({
        models: [
          { name: 'models/gemini-text', supportedGenerationMethods: ['generateContent', 'countTokens'] },
          { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] },
        ],
      }),
    )
    expect(await listModels(configFor('gemini'), { fetchImpl })).toEqual(['gemini-text'])
    expect(fetchImpl.mock.calls[0]?.[0]).toContain('/v1beta/models')
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({ 'x-goog-api-key': 'sk-test-key' })
  })

  it('локальному серверу без ключа не шлёт Authorization', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ data: [{ id: 'llama3.2' }] }))
    const config = configFor('ollama', { apiKey: '', baseUrl: 'http://localhost:11434/v1' })
    await listModels(config, { fetchImpl })
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).not.toHaveProperty('Authorization')
  })

  it('сообщает, если список пуст, и пробрасывает ошибку ключа', async () => {
    const empty = vi.fn<FetchLike>().mockResolvedValue(json({ data: [] }))
    await expect(listModels(configFor('openai'), { fetchImpl: empty })).rejects.toThrow('не вернул список моделей')
    const denied = vi.fn<FetchLike>().mockResolvedValue(json({ error: { message: 'no' } }, 401))
    await expect(listModels(configFor('openai'), { fetchImpl: denied })).rejects.toThrow('неверный ключ API (401)')
  })
})

describe('разбор списков', () => {
  it('понимает и обёртку, и голый массив', () => {
    expect(readOpenAiModels({ data: [{ id: 'x' }] })).toEqual(['x'])
    expect(readOpenAiModels([{ id: 'y' }])).toEqual(['y'])
    expect(readOpenAiModels('нет')).toEqual([])
    expect(readGeminiModels({})).toEqual([])
  })
})
