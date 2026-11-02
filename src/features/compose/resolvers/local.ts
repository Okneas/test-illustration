import { pickForMetaphor } from '../variation'
import type { MetaphorResolver } from '../types'

/**
 * Подбор без сети и ключей: слова запроса сопоставляются с названиями, тегами и словарём смыслов
 * библиотеки. Используется, когда LLM не подключена, и как запасной вариант при её ошибке.
 */
export const localResolver: MetaphorResolver = async (text, { variant = 0 } = {}) => pickForMetaphor(text, variant)
