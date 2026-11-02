import { describe, expect, it, vi } from 'vitest'
import { createComplete, readGeminiText, readOpenAiText } from './complete'
import { checkLlmConfig, type LlmConfig } from './config'
import type { FetchLike } from './http'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function configFor(providerId: string, patch: { model?: string; baseUrl?: string; apiKey?: string } = {}): LlmConfig {
  const result = checkLlmConfig({
    providerId,
    model: patch.model ?? 'test-model',
    baseUrl: patch.baseUrl ?? 'https://api.openai.com/v1',
    apiKey: patch.apiKey ?? 'sk-test-key',
  })
  if (result.status !== 'ready') throw new Error('настройки для теста не готовы')
  return result.config
}

type Call = { url: string; init: RequestInit; body: Record<string, unknown> }

function recorder(response: Response) {
  const calls: Call[] = []
  const fetchImpl = vi.fn<FetchLike>(async (input, init) => {
    calls.push({ url: String(input), init: init ?? {}, body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown> })
    return response
  })
  return { fetchImpl, calls }
}

describe('OpenAI-совместимые сервисы', () => {
  it('шлёт chat/completions с ключом и возвращает текст ответа', async () => {
    const { fetchImpl, calls } = recorder(json({ choices: [{ message: { content: '{"ids":["coin"]}' } }] }))
    const complete = createComplete(configFor('openai', { model: 'gpt-4o-mini' }), { fetchImpl })

    expect(await complete('система', 'запрос')).toBe('{"ids":["coin"]}')

    const [call] = calls
    expect(call?.url).toBe('https://api.openai.com/v1/chat/completions')
    expect(call?.init.method).toBe('POST')
    expect(call?.init.headers).toMatchObject({ Authorization: 'Bearer sk-test-key', 'Content-Type': 'application/json' })
    expect(call?.body).toEqual({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'система' },
        { role: 'user', content: 'запрос' },
      ],
    })
  })

  it('идёт на адрес, который задал пользователь (свой прокси, Groq, OpenRouter)', async () => {
    const { fetchImpl, calls } = recorder(json({ choices: [{ message: { content: 'ok' } }] }))
    const config = configFor('custom', { baseUrl: 'https://proxy.example.com/openai/v1/' })
    await createComplete(config, { fetchImpl })('s', 'u')
    expect(calls[0]?.url).toBe('https://proxy.example.com/openai/v1/chat/completions')
  })

  it('локальному серверу без ключа не шлёт заголовок Authorization', async () => {
    const { fetchImpl, calls } = recorder(json({ choices: [{ message: { content: 'ok' } }] }))
    const config = configFor('ollama', { apiKey: '', model: 'llama3.2', baseUrl: 'http://localhost:11434/v1' })
    await createComplete(config, { fetchImpl })('s', 'u')
    expect(calls[0]?.init.headers).not.toHaveProperty('Authorization')
  })

  it('читает ответ, разбитый на части, и отклоняет пустой', () => {
    expect(readOpenAiText({ choices: [{ message: { content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] } }] })).toBe('ab')
    for (const bad of [{}, { choices: [] }, { choices: [{ message: { content: '  ' } }] }, null, 'text']) {
      expect(() => readOpenAiText(bad)).toThrow('без текста')
    }
  })

  it('при ошибке сервиса не раскрывает ключ', async () => {
    const { fetchImpl } = recorder(json({ error: { message: 'bad key sk-test-key' } }, 401))
    const error = await createComplete(configFor('openai'), { fetchImpl })('s', 'u').catch((e: Error) => e)
    expect((error as Error).message).toContain('неверный ключ API (401)')
    expect((error as Error).message).not.toContain('sk-test-key')
  })
})

describe('Google Gemini', () => {
  it('шлёт generateContent с ключом в заголовке, а не в адресе', async () => {
    const { fetchImpl, calls } = recorder(json({ candidates: [{ content: { parts: [{ text: '{"ids":["lamp"]}' }] } }] }))
    const complete = createComplete(configFor('gemini', { model: 'gemini-2.0-flash', apiKey: 'AIza-secret' }), { fetchImpl })

    expect(await complete('система', 'запрос')).toBe('{"ids":["lamp"]}')

    const [call] = calls
    expect(call?.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent')
    expect(call?.url).not.toContain('AIza-secret')
    expect(call?.init.headers).toMatchObject({ 'x-goog-api-key': 'AIza-secret' })
    expect(call?.body).toEqual({
      systemInstruction: { parts: [{ text: 'система' }] },
      contents: [{ role: 'user', parts: [{ text: 'запрос' }] }],
    })
  })

  it('принимает название модели в виде models/…', async () => {
    const { fetchImpl, calls } = recorder(json({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }))
    await createComplete(configFor('gemini', { model: 'models/gemini-x' }), { fetchImpl })('s', 'u')
    expect(calls[0]?.url).toContain('/v1beta/models/gemini-x:generateContent')
  })

  it('объясняет блокировку запроса и пустой ответ', () => {
    expect(() => readGeminiText({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow('заблокирован сервисом (SAFETY)')
    expect(() => readGeminiText({ candidates: [] })).toThrow('без текста')
    expect(readGeminiText({ candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] } }] })).toBe('ab')
  })
})
