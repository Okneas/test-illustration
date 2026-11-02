import { describe, expect, it } from 'vitest'
import { lookupByNames, normalizeText, searchObjects } from './search'

const ids = (query: string) => searchObjects(query).map((result) => result.object.id)

describe('normalizeText', () => {
  it('приводит регистр, «ё» и пробелы', () => {
    expect(normalizeText('  Кошелёк,  ТЮЛЬПАНЫ! ')).toBe('кошелек тюльпаны')
  })
})

describe('searchObjects', () => {
  it('находит по названию в любом регистре и с «е» вместо «ё»', () => {
    expect(ids('КОШЕЛЕК')[0]).toBe('wallet')
    expect(ids('кошелёк')[0]).toBe('wallet')
  })

  it('понимает падежи и множественное число', () => {
    expect(ids('телефоны')[0]).toBe('phone')
    expect(ids('книги')[0]).toBe('book')
    expect(ids('кошелька')[0]).toBe('wallet')
    expect(ids('наушников')[0]).toBe('headphones')
  })

  it('находит по тегу, но название весит больше', () => {
    expect(ids('смартфон')).toContain('phone')
    const [first] = searchObjects('деньги')
    expect(first?.object.id === 'coin' || first?.object.id === 'wallet').toBe(true)
    expect(searchObjects('телефон')[0]?.score).toBeGreaterThan(searchObjects('смартфон')[0]?.score ?? 0)
  })

  it('понимает английские названия', () => {
    expect(ids('headphones')[0]).toBe('headphones')
  })

  it('не путает похожие по началу слова', () => {
    expect(ids('ламинат')).not.toContain('lamp')
  })

  it('возвращает пусто для пустого запроса, служебных слов и неизвестных тем', () => {
    expect(searchObjects('   ')).toEqual([])
    expect(searchObjects('и в на для')).toEqual([])
    expect(searchObjects('квантовая хромодинамика')).toEqual([])
  })

  it('отмечает, чем найден объект: названием, тегом или смыслом', () => {
    expect(searchObjects('телефон')[0]).toMatchObject({ via: 'name' })
    expect(searchObjects('смартфон')[0]).toMatchObject({ via: 'tag' })
    expect(searchObjects('компьютер')[0]).toMatchObject({ via: 'concept' })
  })
})

describe('searchObjects: подбор по смыслу', () => {
  it.each([
    ['музыка', 'headphones'],
    ['подарок на праздник', 'vase'],
    ['безопасность', 'coin'], // на монете замок
    ['пароль и защита', 'coin'],
    ['юридические документы', 'folder'],
    ['подпись договора', 'pen'],
    ['командная работа', 'puzzle'],
    ['нейросеть', 'lamp'],
    ['мобильное приложение', 'phone'],
    ['учёба в университете', 'book'],
    ['личный бюджет', 'wallet'],
  ])('«%s» → первым идёт %s', (query, expected) => {
    expect(ids(query)[0]).toBe(expected)
  })

  it('«успешный стартап» даёт монету, лампу и телефон, хотя этих слов нет в названиях', () => {
    expect(ids('Успешный стартап').slice(0, 3).sort()).toEqual(['coin', 'lamp', 'phone'])
  })

  it('понимает широкие запросы без слов из названий', () => {
    for (const query of ['бизнес', 'технологии', 'развитие', 'творчество', 'удалённая работа', 'здоровье', 'будущее']) {
      expect(searchObjects(query).length, query).toBeGreaterThan(0)
    }
  })

  it('учитывает падежи и числа в смысловых словах', () => {
    expect(ids('инвестициями')[0]).toMatch(/coin|wallet/)
    expect(ids('в университете')[0]).toBe('book')
  })

  it('название по-прежнему весит больше смысла', () => {
    expect(ids('лампа')[0]).toBe('lamp')
    expect(ids('кошелёк')[0]).toBe('wallet')
    expect(ids('наушники')[0]).toBe('headphones')
  })

  it('не цепляется за случайные начала слов', () => {
    expect(ids('экономика')).not.toContain('vase') // не путает с «эко-» из природы
    expect(ids('ботаника')[0]).toBe('vase')
    expect(searchObjects('новый продукт').every((result) => result.object.id !== 'vase')).toBe(true)
  })
})

describe('lookupByNames', () => {
  it('разбирает список через запятую, точку с запятой и перенос строки', () => {
    const result = lookupByNames('Телефон, лампа;книга\nмонета')
    expect(result.map((item) => item.query)).toEqual(['Телефон', 'лампа', 'книга', 'монета'])
    expect(result.map((item) => item.matches[0]?.object.id)).toEqual(['phone', 'lamp', 'book', 'coin'])
  })

  it('сохраняет запрос без совпадений, чтобы показать его пользователю', () => {
    const [unknown] = lookupByNames('Квантовая хромодинамика')
    expect(unknown).toEqual({ query: 'Квантовая хромодинамика', matches: [], exact: false })
  })

  it('помечает точные совпадения и похожие по смыслу', () => {
    const [phone, computer] = lookupByNames('Телефон, компьютер')
    expect(phone).toMatchObject({ exact: true })
    // «Компьютер» в библиотеке нет, но по смыслу рядом телефон: это не точное совпадение.
    expect(computer).toMatchObject({ exact: false })
    expect(computer?.matches[0]?.object.id).toBe('phone')
  })

  it('игнорирует пустые элементы', () => {
    expect(lookupByNames(' , ;; ')).toEqual([])
  })
})
