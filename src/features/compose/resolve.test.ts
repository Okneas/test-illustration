import { describe, expect, it, vi } from 'vitest'
import { PROVIDERS } from './llm/providers'
import { resolveMetaphor } from './resolve'
import type { MetaphorResolver } from './types'

const local: MetaphorResolver = async () => ['book']
const config = {
  provider: PROVIDERS[1],
  apiKey: 'sk-secret',
  model: 'gpt-4o-mini',
  baseUrl: 'https://api.openai.com/v1',
}

describe('resolveMetaphor', () => {
  it('без настроек LLM использует локальный подбор и не обращается к LLM', async () => {
    expect(await resolveMetaphor('стартап', { local })).toEqual({ ids: ['book'], source: 'local', notice: undefined })
    expect(await resolveMetaphor('стартап', { config: null, local })).toMatchObject({ ids: ['book'], source: 'local' })
  })

  it('с LLM берёт её ответ и называет модель', async () => {
    const llm = vi.fn<MetaphorResolver>().mockResolvedValue(['coin', 'lamp'])
    const outcome = await resolveMetaphor('стартап', { config, llm, local })
    expect(outcome).toEqual({ ids: ['coin', 'lamp'], source: 'llm', via: 'OpenAI · gpt-4o-mini' })
    expect(llm).toHaveBeenCalledWith('стартап', { variant: 0 })
  })

  it('передаёт номер варианта и локальному подбору', async () => {
    const spy = vi.fn<MetaphorResolver>().mockResolvedValue(['book'])
    await resolveMetaphor('стартап', { variant: 3, local: spy })
    expect(spy).toHaveBeenCalledWith('стартап', { variant: 3 })
  })

  it('при ошибке LLM подбирает локально и сообщает причину, не раскрывая ключ', async () => {
    const llm = vi.fn<MetaphorResolver>().mockRejectedValue(new Error('неверный ключ API (401)'))
    const outcome = await resolveMetaphor('стартап', { config, llm, local })
    expect(outcome.source).toBe('local')
    expect(outcome.ids).toEqual(['book'])
    expect(outcome.notice).toContain('неверный ключ API (401)')
    expect(outcome.notice).not.toContain('sk-secret')
  })

  it('при пустом ответе LLM подбирает локально', async () => {
    const llm: MetaphorResolver = async () => []
    const outcome = await resolveMetaphor('стартап', { config, llm, local })
    expect(outcome).toMatchObject({ source: 'local', ids: ['book'] })
    expect(outcome.notice).toBeTruthy()
  })

  it('если ничего не нашлось, берёт универсальный набор и честно об этом говорит', async () => {
    const outcome = await resolveMetaphor('квантовая хромодинамика')
    expect(outcome.source).toBe('local')
    expect(outcome.ids.length).toBeGreaterThanOrEqual(3)
    expect(outcome.notice).toContain('универсальные')
  })

  it('к сообщению об ошибке LLM добавляет и сообщение об универсальном наборе', async () => {
    const llm: MetaphorResolver = async () => {
      throw new Error('нет сети')
    }
    const outcome = await resolveMetaphor('квантовая хромодинамика', { config, llm })
    expect(outcome.notice).toContain('нет сети')
    expect(outcome.notice).toContain('универсальные')
  })
})
