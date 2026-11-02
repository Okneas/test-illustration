import { describe, expect, it } from 'vitest'
import { checkLlmConfig, describeConfig, type LlmDraft } from './config'
import { getProvider, PROVIDERS } from './providers'

const draft = (patch: Partial<LlmDraft> = {}): LlmDraft => ({
  providerId: 'openai',
  model: 'gpt-4o-mini',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-test-key',
  ...patch,
})

describe('PROVIDERS', () => {
  it('у каждого провайдера уникальный id и подпись, а у редактируемого адреса есть пример', () => {
    const ids = PROVIDERS.map((provider) => provider.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const provider of PROVIDERS) {
      expect(provider.name).not.toBe('')
      expect(getProvider(provider.id)).toBe(provider)
      if (provider.editableUrl && provider.id !== 'custom') expect(provider.baseUrl).toMatch(/^https?:\/\//)
    }
  })

  it('покрывает три семейства API', () => {
    expect(new Set(PROVIDERS.map((provider) => provider.kind))).toEqual(new Set(['anthropic', 'openai', 'gemini']))
  })

  it('все готовые адреса защищены: https, кроме локального сервера', () => {
    for (const provider of PROVIDERS) {
      if (provider.baseUrl && provider.id !== 'ollama') expect(provider.baseUrl, provider.id).toMatch(/^https:\/\//)
    }
  })
})

describe('checkLlmConfig', () => {
  it('без ключа LLM просто выключена: это не ошибка', () => {
    expect(checkLlmConfig(draft({ apiKey: '' }))).toEqual({ status: 'off' })
    expect(checkLlmConfig(draft({ apiKey: '   ' }))).toEqual({ status: 'off' })
  })

  it('неизвестный провайдер — выключено', () => {
    expect(checkLlmConfig(draft({ providerId: 'нет-такого' }))).toEqual({ status: 'off' })
  })

  it('с ключом, но без модели просит указать модель', () => {
    expect(checkLlmConfig(draft({ model: '' }))).toEqual({
      status: 'incomplete',
      reason: 'Укажите модель или загрузите их список',
    })
  })

  it('готовые настройки очищены от пробелов и без завершающего слэша', () => {
    const result = checkLlmConfig(draft({ apiKey: ' sk-1 ', model: ' gpt-4o-mini ', baseUrl: 'https://api.example.com/v1/// ' }))
    expect(result).toMatchObject({
      status: 'ready',
      config: { apiKey: 'sk-1', model: 'gpt-4o-mini', baseUrl: 'https://api.example.com/v1' },
    })
  })

  it('у Anthropic и Gemini адрес берётся из пресета, а не из формы', () => {
    const anthropic = checkLlmConfig(draft({ providerId: 'anthropic', baseUrl: 'https://evil.example/v1', model: 'claude-opus-5-5' }))
    expect(anthropic).toMatchObject({ status: 'ready', config: { baseUrl: 'https://api.anthropic.com' } })
    const gemini = checkLlmConfig(draft({ providerId: 'gemini', baseUrl: '', model: 'gemini-x' }))
    expect(gemini).toMatchObject({ status: 'ready', config: { baseUrl: 'https://generativelanguage.googleapis.com' } })
  })

  it.each([
    ['', 'Укажите адрес API'],
    ['api.example.com/v1', 'Адрес API записан неверно: нужен полный адрес вида https://…'],
    ['http://api.example.com/v1', 'Адрес должен начинаться с https:// (http разрешён только для localhost)'],
    ['ftp://example.com', 'Адрес должен начинаться с https:// (http разрешён только для localhost)'],
  ])('отклоняет адрес %j: ключ нельзя слать по открытому каналу', (baseUrl, reason) => {
    expect(checkLlmConfig(draft({ baseUrl }))).toEqual({ status: 'incomplete', reason })
  })

  it.each(['http://localhost:11434/v1', 'http://127.0.0.1:1234/v1', 'http://[::1]:8080/v1'])(
    'разрешает http для локального сервера %s',
    (baseUrl) => {
      expect(checkLlmConfig(draft({ baseUrl }))).toMatchObject({ status: 'ready' })
    },
  )

  it('локальному серверу ключ не нужен, но модель нужна', () => {
    const ollama = { providerId: 'ollama', baseUrl: 'http://localhost:11434/v1', apiKey: '' }
    expect(checkLlmConfig(draft({ ...ollama, model: '' }))).toEqual({ status: 'off' })
    expect(checkLlmConfig(draft({ ...ollama, model: 'llama3.2' }))).toMatchObject({
      status: 'ready',
      config: { apiKey: '', model: 'llama3.2' },
    })
  })

  it('для загрузки списка моделей название модели не требуется', () => {
    expect(checkLlmConfig(draft({ model: '' }), { needModel: false })).toMatchObject({ status: 'ready' })
  })

  it('локальный сервер без ключа и без модели можно опросить, чтобы получить список моделей', () => {
    const ollama = { providerId: 'ollama', baseUrl: 'http://localhost:11434/v1', apiKey: '', model: '' }
    expect(checkLlmConfig(draft(ollama), { needModel: false })).toMatchObject({ status: 'ready' })
    // а для сборки по метафоре без модели LLM остаётся выключенной
    expect(checkLlmConfig(draft(ollama))).toEqual({ status: 'off' })
  })

  it('для загрузки списка у сервиса, которому нужен ключ, ключ по-прежнему обязателен', () => {
    expect(checkLlmConfig(draft({ apiKey: '', model: '' }), { needModel: false })).toEqual({ status: 'off' })
  })
})

describe('describeConfig', () => {
  it('называет провайдера и модель', () => {
    const result = checkLlmConfig(draft())
    expect(result.status === 'ready' && describeConfig(result.config)).toBe('OpenAI · gpt-4o-mini')
  })
})
