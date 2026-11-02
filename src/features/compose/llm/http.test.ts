import { describe, expect, it, vi } from 'vitest'
import { fetchJson, sanitizeDetail, type FetchLike } from './http'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('fetchJson', () => {
  it('возвращает разобранный JSON при успехе', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ ok: true }))
    expect(await fetchJson('https://api.example.com/x', { method: 'POST' }, { fetchImpl })).toEqual({ ok: true })
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
  })

  it.each([
    [401, 'неверный ключ API (401)'],
    [403, 'доступ запрещён: проверьте ключ и его права (403)'],
    [404, 'не найдено: проверьте адрес и название модели (404)'],
    [429, 'превышен лимит запросов или время ожидания (429)'],
    [503, 'ошибка на стороне сервиса (503)'],
    [400, 'запрос отклонён (400)'],
  ])('понятно описывает статус %d', async (status, expected) => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({}, status))
    await expect(fetchJson('https://api.example.com/x', {}, { fetchImpl })).rejects.toThrow(expected)
  })

  it('добавляет текст ошибки сервиса из разных полей', async () => {
    const shapes = [
      { error: { message: 'bad model' } }, // OpenAI, Gemini, Anthropic
      { error: 'bad model' }, // часть совместимых серверов
      { message: 'bad model' },
      [{ error: { message: 'bad model' } }], // Gemini иногда отвечает массивом
    ]
    for (const body of shapes) {
      const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json(body, 400))
      await expect(fetchJson('https://api.example.com/x', {}, { fetchImpl })).rejects.toThrow('запрос отклонён (400): bad model')
    }
  })

  it('не показывает ключ, даже если сервис вернул его в тексте ошибки', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json({ error: { message: 'Incorrect API key provided: sk-live-123456' } }, 401))
    const error = await fetchJson('https://api.example.com/x', {}, { fetchImpl, secrets: ['sk-live-123456'] }).catch((e: Error) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('***')
    expect((error as Error).message).not.toContain('sk-live-123456')
  })

  it('терпит тело ошибки не в JSON', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))
    await expect(fetchJson('https://api.example.com/x', {}, { fetchImpl })).rejects.toThrow('ошибка на стороне сервиса (502)')
  })

  it('сообщает о сетевом сбое с подсказкой про CORS и адресом хоста', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await fetchJson('https://api.example.com/v1/x', {}, { fetchImpl }).catch((e: Error) => e)
    expect((error as Error).message).toContain('api.example.com')
    expect((error as Error).message).toContain('CORS')
    expect((error as Error).cause).toBeInstanceOf(TypeError)
  })

  it('сообщает о таймауте отдельно', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' })
    const fetchImpl = vi.fn<FetchLike>().mockRejectedValue(timeout)
    await expect(fetchJson('https://api.example.com/x', {}, { fetchImpl })).rejects.toThrow('сервис не ответил вовремя')
  })

  it('сообщает, если успешный ответ не JSON', async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(new Response('ok', { status: 200 }))
    await expect(fetchJson('https://api.example.com/x', {}, { fetchImpl })).rejects.toThrow('не в формате JSON')
  })
})

describe('sanitizeDetail', () => {
  it('маскирует секреты, схлопывает пробелы и обрезает длинный текст', () => {
    expect(sanitizeDetail('key  sk-abcdef\n here', ['sk-abcdef'])).toBe('key *** here')
    const long = sanitizeDetail('x'.repeat(500), [])
    expect(long.length).toBeLessThanOrEqual(201)
    expect(long.endsWith('…')).toBe(true)
  })

  it('не маскирует слишком короткие «секреты»: иначе испортит любой текст', () => {
    expect(sanitizeDetail('a b c', ['a'])).toBe('a b c')
  })
})
