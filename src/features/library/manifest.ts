import type { LibraryObject } from './types'

/**
 * Десять объектов библиотеки из Figma («Библиотека компонентов»). У каждого есть 4 варианта:
 * {main, background} × {S, L}; файлы лежат в src/assets/library.
 */
export const LIBRARY_OBJECTS = [
  {
    id: 'book',
    name: 'Книга',
    tags: ['учебник', 'чтение', 'знания', 'обучение', 'образование', 'курс', 'библиотека', 'учёба', 'book', 'reading', 'education', 'knowledge', 'learning', 'study'],
  },
  {
    id: 'phone',
    name: 'Телефон',
    tags: ['смартфон', 'мобильный', 'приложение', 'связь', 'звонок', 'мессенджер', 'гаджет', 'phone', 'smartphone', 'mobile', 'app', 'call'],
  },
  {
    id: 'puzzle',
    name: 'Пазлы',
    tags: ['пазл', 'головоломка', 'решение', 'команда', 'интеграция', 'стратегия', 'сборка', 'puzzle', 'solution', 'team', 'integration'],
  },
  {
    id: 'coin',
    name: 'Монета',
    tags: ['деньги', 'финансы', 'инвестиции', 'доход', 'прибыль', 'накопления', 'стартап', 'бизнес', 'успех', 'рост', 'coin', 'money', 'finance', 'investment', 'profit', 'startup', 'business', 'success'],
  },
  {
    id: 'headphones',
    name: 'Наушники',
    tags: ['музыка', 'подкаст', 'аудио', 'звук', 'слушать', 'радио', 'headphones', 'music', 'podcast', 'audio', 'sound'],
  },
  {
    id: 'lamp',
    name: 'Лампа',
    tags: ['идея', 'свет', 'озарение', 'творчество', 'инсайт', 'изобретение', 'стартап', 'инновации', 'искусственный интеллект', 'lamp', 'idea', 'light', 'insight', 'innovation', 'startup'],
  },
  {
    id: 'vase',
    name: 'Ваза с тюльпанами',
    tags: ['тюльпаны', 'цветы', 'цветок', 'весна', 'праздник', 'подарок', 'красота', 'забота', 'ваза', 'flowers', 'spring', 'gift', 'tulips', 'vase'],
  },
  {
    id: 'wallet',
    name: 'Кошелёк',
    tags: ['деньги', 'платёж', 'оплата', 'покупки', 'бюджет', 'финансы', 'карта', 'wallet', 'payment', 'purchase', 'budget', 'money'],
  },
  {
    id: 'folder',
    name: 'Папка',
    tags: ['документы', 'файлы', 'архив', 'проект', 'отчёт', 'данные', 'folder', 'documents', 'files', 'project', 'report', 'data'],
  },
  {
    id: 'pen',
    name: 'Ручка',
    tags: ['письмо', 'подпись', 'заметки', 'договор', 'писать', 'текст', 'pen', 'writing', 'signature', 'notes', 'contract'],
  },
] as const satisfies readonly LibraryObject[]

export type LibraryObjectId = (typeof LIBRARY_OBJECTS)[number]['id']

const BY_ID: ReadonlyMap<string, (typeof LIBRARY_OBJECTS)[number]> = new Map(
  LIBRARY_OBJECTS.map((object) => [object.id, object]),
)

export function getLibraryObject(id: string) {
  return BY_ID.get(id)
}

export function isLibraryObjectId(id: string): id is LibraryObjectId {
  return BY_ID.has(id)
}
