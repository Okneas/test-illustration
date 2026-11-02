/** Подмена `fetch` для тестов. */
export type FetchLike = typeof fetch

export type HttpOptions = {
  fetchImpl?: FetchLike
  timeoutMs?: number
  /** Строки, которые нельзя показывать в сообщениях об ошибках (ключ пользователя). */
  secrets?: readonly string[]
}

const DEFAULT_TIMEOUT_MS = 45_000
const MAX_DETAIL_LENGTH = 200

const STATUS_LABELS: readonly [test: (status: number) => boolean, label: string][] = [
  [(status) => status === 401, 'неверный ключ API'],
  [(status) => status === 403, 'доступ запрещён: проверьте ключ и его права'],
  [(status) => status === 404, 'не найдено: проверьте адрес и название модели'],
  [(status) => status === 408 || status === 429, 'превышен лимит запросов или время ожидания'],
  [(status) => status >= 500, 'ошибка на стороне сервиса'],
  [(status) => status >= 400, 'запрос отклонён'],
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** Достаёт текст ошибки из тела ответа: у разных сервисов он лежит в разных полях. */
function extractDetail(body: unknown): string {
  if (typeof body === 'string') return body
  const source = Array.isArray(body) ? body[0] : body
  if (!isRecord(source)) return ''
  const { error, message } = source
  if (typeof error === 'string') return error
  if (isRecord(error) && typeof error.message === 'string') return error.message
  return typeof message === 'string' ? message : ''
}

/** Убирает из текста секреты, схлопывает пробелы и обрезает длину. */
export function sanitizeDetail(text: string, secrets: readonly string[]): string {
  let result = text
  for (const secret of secrets) {
    if (secret.length >= 6) result = result.split(secret).join('***')
  }
  result = result.replace(/\s+/g, ' ').trim()
  return result.length > MAX_DETAIL_LENGTH ? `${result.slice(0, MAX_DETAIL_LENGTH)}…` : result
}

async function describeHttpError(response: Response, secrets: readonly string[]): Promise<string> {
  const label = STATUS_LABELS.find(([test]) => test(response.status))?.[1] ?? 'неожиданный ответ сервиса'
  let detail = ''
  try {
    detail = sanitizeDetail(extractDetail(await response.json()), secrets)
  } catch {
    // тело не JSON: достаточно кода и описания
  }
  return `${label} (${response.status})${detail ? `: ${detail}` : ''}`
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(ms) : undefined
}

/**
 * Запрос с таймаутом и понятными ошибками. Тело ошибки сервиса показывается без ключа и в
 * сокращённом виде; сетевой сбой объясняется отдельно (чаще всего это CORS или неверный адрес).
 */
export async function fetchJson(url: string, init: RequestInit, options: HttpOptions = {}): Promise<unknown> {
  const { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, secrets = [] } = options
  let response: Response
  try {
    response = await fetchImpl(url, { ...init, signal: timeoutSignal(timeoutMs) })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error('сервис не ответил вовремя', { cause: error })
    }
    throw new Error(
      `не удалось подключиться к ${hostOf(url)}: проверьте адрес и сеть; возможно, сервис не разрешает запросы из браузера (CORS)`,
      { cause: error },
    )
  }
  if (!response.ok) throw new Error(await describeHttpError(response, secrets))
  try {
    return await response.json()
  } catch (error) {
    throw new Error('сервис вернул ответ не в формате JSON', { cause: error })
  }
}

export { isRecord }
