/**
 * Семейство API. Большинство сервисов говорят на «OpenAI-совместимом» диалекте (OpenAI, OpenRouter,
 * Groq, Mistral, DeepSeek, Together, Ollama, LM Studio и другие), поэтому один вариант `openai`
 * покрывает их все, а у Anthropic и Google свои форматы.
 */
export type ProviderKind = 'anthropic' | 'openai' | 'gemini'

export type ProviderPreset = {
  id: string
  name: string
  kind: ProviderKind
  /** Адрес API. У Anthropic и Gemini зашит в код, у `openai` его можно менять. */
  baseUrl: string
  editableUrl: boolean
  /** Нужен ли ключ. Локальным серверам (Ollama) он не нужен. */
  needsKey: boolean
  keyHint: string
  /** Модель, подставляемая при выборе провайдера (пусто — выберите из списка или впишите). */
  defaultModel: string
  /** Пример названия модели для подсказки в поле. */
  modelHint: string
  /** Важное предупреждение для пользователя. */
  note?: string
}

export const PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    editableUrl: false,
    needsKey: true,
    keyHint: 'sk-ant-…',
    defaultModel: 'claude-opus-5-5',
    modelHint: 'claude-opus-5-5',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    editableUrl: true,
    needsKey: true,
    keyHint: 'sk-…',
    defaultModel: '',
    modelHint: 'gpt-4o-mini',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    kind: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    editableUrl: false,
    needsKey: true,
    keyHint: 'AIza…',
    defaultModel: '',
    modelHint: 'gemini-2.0-flash',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (сотни моделей)',
    kind: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    editableUrl: true,
    needsKey: true,
    keyHint: 'sk-or-…',
    defaultModel: '',
    modelHint: 'openai/gpt-4o-mini',
  },
  {
    id: 'groq',
    name: 'Groq',
    kind: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    editableUrl: true,
    needsKey: true,
    keyHint: 'gsk_…',
    defaultModel: '',
    modelHint: 'llama-3.3-70b-versatile',
  },
  {
    id: 'ollama',
    name: 'Ollama (на этом компьютере)',
    kind: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    editableUrl: true,
    needsKey: false,
    keyHint: 'не нужен',
    defaultModel: '',
    modelHint: 'llama3.2',
    note: 'Ollama должна разрешать запросы с этой страницы: запустите её с переменной OLLAMA_ORIGINS, в которую входит адрес страницы.',
  },
  {
    id: 'custom',
    name: 'Другой (OpenAI-совместимый)',
    kind: 'openai',
    baseUrl: '',
    editableUrl: true,
    needsKey: true,
    keyHint: 'ключ вашего сервиса',
    defaultModel: '',
    modelHint: 'название модели',
    note: 'Подойдёт любой сервис с адресом вида …/v1/chat/completions: Mistral, DeepSeek, Together, LM Studio, собственный прокси. Он должен разрешать запросы из браузера (CORS).',
  },
] as const satisfies readonly ProviderPreset[]

export type ProviderId = (typeof PROVIDERS)[number]['id']

export const DEFAULT_PROVIDER_ID: ProviderId = 'anthropic'

export function getProvider(id: string): ProviderPreset | undefined {
  return PROVIDERS.find((provider) => provider.id === id)
}
