import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { LlmDraft } from './llm/config'
import { DEFAULT_PROVIDER_ID, getProvider } from './llm/providers'

type LlmStore = LlmDraft & {
  /** Список моделей, загруженный у провайдера: подсказки для поля «Модель». Не сохраняется. */
  models: string[]
  setProvider: (providerId: string) => void
  setModel: (model: string) => void
  setBaseUrl: (baseUrl: string) => void
  setApiKey: (apiKey: string) => void
  setModels: (models: string[]) => void
}

type Persisted = Pick<LlmDraft, 'providerId' | 'model' | 'baseUrl'>

function initialDraft(): Persisted {
  const provider = getProvider(DEFAULT_PROVIDER_ID)
  return { providerId: DEFAULT_PROVIDER_ID, model: provider?.defaultModel ?? '', baseUrl: provider?.baseUrl ?? '' }
}

function isPersisted(value: unknown): value is Persisted {
  if (typeof value !== 'object' || value === null) return false
  const { providerId, model, baseUrl } = value as Record<string, unknown>
  return typeof providerId === 'string' && typeof model === 'string' && typeof baseUrl === 'string'
}

/**
 * Настройки подключения LLM (BYOK). Провайдер, модель и адрес запоминаются в браузере, чтобы не вводить
 * их каждый раз. Ключ API живёт только в памяти вкладки: он не попадает ни в localStorage, ни в логи.
 */
export const useLlmStore = create<LlmStore>()(
  persist(
    (set) => ({
      ...initialDraft(),
      apiKey: '',
      models: [],

      // Ключ при смене провайдера сбрасывается: чужой ключ нельзя отправлять на другой адрес.
      setProvider: (providerId) => {
        const provider = getProvider(providerId)
        if (!provider) return
        set({ providerId, model: provider.defaultModel, baseUrl: provider.baseUrl, apiKey: '', models: [] })
      },
      setModel: (model) => set({ model }),
      setBaseUrl: (baseUrl) => set({ baseUrl, models: [] }),
      setApiKey: (apiKey) => set({ apiKey }),
      setModels: (models) => set({ models }),
    }),
    {
      name: 'illustration-llm-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ providerId, model, baseUrl }): Persisted => ({ providerId, model, baseUrl }),
      // Сохранённое проверяем: провайдер мог исчезнуть из списка, а значение — быть испорчено.
      merge: (persisted, current) =>
        isPersisted(persisted) && getProvider(persisted.providerId)
          ? { ...current, providerId: persisted.providerId, model: persisted.model, baseUrl: persisted.baseUrl }
          : current,
    },
  ),
)
