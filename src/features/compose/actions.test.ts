import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSceneStore } from '@/features/scene/store'
import { assembleByMetaphor, reassembleMetaphor } from './actions'
import { useLlmStore } from './llmStore'
import { useComposeStore } from './store'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const objectIds = () => useSceneStore.getState().objects.map((object) => object.objectId)
const summary = () => useComposeStore.getState().lastAssembly

function connectOpenAi(model = 'gpt-4o-mini') {
  const llm = useLlmStore.getState()
  llm.setProvider('openai')
  llm.setApiKey('sk-test-key')
  llm.setModel(model)
}

describe('assembleByMetaphor', () => {
  beforeEach(() => {
    localStorage.clear()
    useSceneStore.setState(useSceneStore.getInitialState(), true)
    useComposeStore.setState(useComposeStore.getInitialState(), true)
    useLlmStore.setState(useLlmStore.getInitialState(), true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('без LLM', () => {
    it('собирает композицию локально и запоминает итог', async () => {
      useComposeStore.setState({ variety: false })
      await assembleByMetaphor('Успешный стартап')

      expect(objectIds()).toHaveLength(4)
      expect(summary()).toMatchObject({ text: 'Успешный стартап', source: 'local', variant: 0 })
      expect(summary()?.ids).toEqual(expect.arrayContaining(['coin', 'lamp', 'phone']))
      expect(summary()?.names).toHaveLength(4)
    })

    it('без разнообразия: один размер из настроек, три главных и один фоновый', async () => {
      useComposeStore.setState({ variety: false })
      useSceneStore.setState({ defaultSize: 'S' })
      await assembleByMetaphor('Успешный стартап')

      const { objects } = useSceneStore.getState()
      expect(new Set(objects.map((object) => object.size))).toEqual(new Set(['S']))
      expect(objects.filter((object) => object.state === 'main')).toHaveLength(3)
    })

    it('с разнообразием размеры и состояния разные, но композиция остаётся разумной', async () => {
      await assembleByMetaphor('Бизнес')
      const first = useSceneStore.getState().objects.map(({ objectId, size, state }) => ({ objectId, size, state }))

      expect(first.filter((object) => object.state === 'main').length).toBeGreaterThanOrEqual(2)
      // тот же запрос и вариант дают то же самое: случайность воспроизводима
      await assembleByMetaphor('Бизнес')
      const second = useSceneStore.getState().objects.map(({ objectId, size, state }) => ({ objectId, size, state }))
      expect(second).toEqual(first)
    })

    it('«Подобрать заново» берёт следующий вариант и даёт другой результат', async () => {
      await assembleByMetaphor('Бизнес')
      const before = JSON.stringify(useSceneStore.getState().objects.map(({ objectId, size, state, x, y }) => [objectId, size, state, x, y]))

      await reassembleMetaphor()
      expect(summary()).toMatchObject({ text: 'Бизнес', variant: 1 })
      const after = JSON.stringify(useSceneStore.getState().objects.map(({ objectId, size, state, x, y }) => [objectId, size, state, x, y]))
      expect(after).not.toBe(before)
    })

    it('«Подобрать заново» без прежней сборки ничего не делает', async () => {
      await reassembleMetaphor()
      expect(objectIds()).toEqual([])
    })

    it('для запроса без совпадений берёт универсальный набор и предупреждает', async () => {
      await assembleByMetaphor('Квантовая хромодинамика')
      expect(objectIds().length).toBeGreaterThanOrEqual(3)
      expect(summary()?.notice).toContain('универсальные')
    })
  })

  describe('со своей LLM (BYOK)', () => {
    it('спрашивает выбранного провайдера и собирает композицию из его ответа', async () => {
      const fetchMock = vi.fn(async () => json({ choices: [{ message: { content: '{"ids": ["wallet", "coin", "dragon"]}' } }] }))
      vi.stubGlobal('fetch', fetchMock)
      connectOpenAi()
      useComposeStore.setState({ variety: false })

      await assembleByMetaphor('Личные финансы')

      expect(fetchMock).toHaveBeenCalledOnce()
      const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      expect(call[0]).toBe('https://api.openai.com/v1/chat/completions')
      expect(call[1].headers).toMatchObject({ Authorization: 'Bearer sk-test-key' })
      expect(JSON.parse(String(call[1].body))).toMatchObject({ model: 'gpt-4o-mini' })

      expect(summary()).toMatchObject({ source: 'llm', via: 'OpenAI · gpt-4o-mini', ids: ['wallet', 'coin'] })
      expect(objectIds().sort()).toEqual(['coin', 'wallet']) // «dragon» из ответа отброшен
    })

    it('«Подобрать заново» не делает новый платный запрос, а меняет свойства и раскладку', async () => {
      const fetchMock = vi.fn(async () => json({ choices: [{ message: { content: '{"ids": ["wallet", "coin", "phone"]}' } }] }))
      vi.stubGlobal('fetch', fetchMock)
      connectOpenAi()

      await assembleByMetaphor('Личные финансы')
      await reassembleMetaphor()

      expect(fetchMock).toHaveBeenCalledOnce()
      expect(summary()).toMatchObject({ source: 'llm', variant: 1, ids: ['wallet', 'coin', 'phone'] })
      expect(objectIds().sort()).toEqual(['coin', 'phone', 'wallet'])
    })

    it('при ошибке сервиса собирает локально и называет причину, не раскрывая ключ', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => json({ error: { message: 'bad key sk-test-key' } }, 401)))
      connectOpenAi()

      await assembleByMetaphor('Успешный стартап')

      expect(summary()?.source).toBe('local')
      expect(summary()?.notice).toContain('неверный ключ API (401)')
      expect(summary()?.notice).not.toContain('sk-test-key')
      expect(objectIds().length).toBeGreaterThan(0) // пользователь не остался ни с чем
    })

    it('при сбое сети объясняет про адрес и CORS', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
      connectOpenAi()
      await assembleByMetaphor('Успешный стартап')
      expect(summary()?.notice).toContain('CORS')
    })

    it('ключ введён, а модель нет: LLM не вызывается, пользователю объясняют почему', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      connectOpenAi('')

      await assembleByMetaphor('Успешный стартап')

      expect(fetchMock).not.toHaveBeenCalled()
      expect(summary()?.source).toBe('local')
      expect(summary()?.notice).toContain('LLM не использована: укажите модель')
    })

    it('работает с Gemini: ключ в заголовке, ответ из candidates', async () => {
      const fetchMock = vi.fn(async () => json({ candidates: [{ content: { parts: [{ text: '{"ids":["lamp","book"]}' }] } }] }))
      vi.stubGlobal('fetch', fetchMock)
      const llm = useLlmStore.getState()
      llm.setProvider('gemini')
      llm.setApiKey('AIza-key')
      llm.setModel('gemini-2.0-flash')

      await assembleByMetaphor('Образование')

      const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      expect(call[0]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent')
      expect(call[1].headers).toMatchObject({ 'x-goog-api-key': 'AIza-key' })
      expect(summary()).toMatchObject({ source: 'llm', via: 'Google Gemini · gemini-2.0-flash', ids: ['lamp', 'book'] })
    })

    it('локальный сервер (Ollama) работает без ключа, если выбрана модель', async () => {
      const fetchMock = vi.fn(async () => json({ choices: [{ message: { content: '{"ids":["book","pen"]}' } }] }))
      vi.stubGlobal('fetch', fetchMock)
      const llm = useLlmStore.getState()
      llm.setProvider('ollama')
      llm.setModel('llama3.2')

      await assembleByMetaphor('Учёба')

      const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      expect(call[0]).toBe('http://localhost:11434/v1/chat/completions')
      expect(call[1].headers).not.toHaveProperty('Authorization')
      expect(summary()).toMatchObject({ source: 'llm', via: 'Ollama (на этом компьютере) · llama3.2' })
    })
  })
})
