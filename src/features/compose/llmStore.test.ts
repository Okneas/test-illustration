import { beforeEach, describe, expect, it } from 'vitest'
import { useLlmStore } from './llmStore'

const STORAGE_KEY = 'illustration-llm-settings'

describe('useLlmStore (BYOK)', () => {
  beforeEach(() => {
    localStorage.clear()
    useLlmStore.setState(useLlmStore.getInitialState(), true)
  })

  it('по умолчанию выбран Claude с его моделью и пустым ключом', () => {
    const state = useLlmStore.getState()
    expect(state).toMatchObject({ providerId: 'anthropic', model: 'claude-opus-5-5', apiKey: '' })
  })

  it('при смене провайдера подставляет его адрес и сбрасывает ключ и список моделей', () => {
    const store = useLlmStore.getState()
    store.setApiKey('sk-ant-secret')
    store.setModels(['m1'])
    store.setProvider('openrouter')

    expect(useLlmStore.getState()).toMatchObject({
      providerId: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: '',
      apiKey: '', // ключ одного сервиса нельзя отправлять другому
      models: [],
    })
  })

  it('игнорирует неизвестного провайдера', () => {
    useLlmStore.getState().setProvider('нет-такого')
    expect(useLlmStore.getState().providerId).toBe('anthropic')
  })

  it('запоминает провайдера, модель и адрес, но никогда не сохраняет ключ', () => {
    const store = useLlmStore.getState()
    store.setProvider('openai')
    store.setModel('gpt-4o-mini')
    store.setApiKey('sk-super-secret-key')
    store.setModels(['gpt-4o-mini'])

    const saved = localStorage.getItem(STORAGE_KEY)
    expect(saved).not.toBeNull()
    expect(saved).not.toContain('sk-super-secret-key')
    expect(saved).not.toContain('apiKey')
    expect(JSON.parse(saved ?? '{}').state).toEqual({
      providerId: 'openai',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
    })
  })

  it('восстанавливает сохранённое, а испорченное и неизвестное игнорирует', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { providerId: 'groq', model: 'llama', baseUrl: 'https://api.groq.com/openai/v1' }, version: 1 }),
    )
    await useLlmStore.persist.rehydrate()
    expect(useLlmStore.getState()).toMatchObject({ providerId: 'groq', model: 'llama', apiKey: '' })

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { providerId: 'исчез', model: 'x', baseUrl: 'y' }, version: 1 }))
    await useLlmStore.persist.rehydrate()
    expect(useLlmStore.getState().providerId).toBe('groq') // осталось прежнее, а не мусор

    localStorage.setItem(STORAGE_KEY, '{ это не json')
    await useLlmStore.persist.rehydrate()
    expect(useLlmStore.getState().providerId).toBe('groq')
  })
})
