// Собирает примеры композиций из examples/ тем же кодом, что и приложение (сценарии 1 и 2,
// авто-раскладка, перекраска, экспорт). Модули проекта грузятся через Vite SSR, поэтому
// работают алиас «@/», TypeScript и import.meta.glob без отдельной сборки.
//
// Запуск: npm run examples
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const server = await createServer({
  root,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
})

try {
  const load = (path) => server.ssrLoadModule(path)
  const [
    { exportSceneSvg },
    { assembleScene, chooseStates, measureItem },
    { resolveMetaphor },
    { planAssembly },
    { lookupByNames },
  ] = await Promise.all([
    load('/src/features/export/buildSvg.ts'),
    load('/src/features/compose/assemble.ts'),
    load('/src/features/compose/resolve.ts'),
    load('/src/features/compose/variation.ts'),
    load('/src/features/library/search.ts'),
  ])
  const { PRESET_PALETTES } = await load('/src/features/palette/schemes.ts')
  const { parsePaletteJson } = await load('/src/features/palette/paletteIO.ts')
  const { FORMATS } = await load('/src/features/scene/formats.ts')

  const format = (id) => FORMATS.find((candidate) => candidate.id === id)
  const preset = (id) => PRESET_PALETTES.find((candidate) => candidate.id === id)

  const sunsetFile = await readFile(new URL('../examples/palette-sunset.json', import.meta.url), 'utf8')
  const sunset = parsePaletteJson(sunsetFile)
  if (!sunset.ok) throw new Error(`examples/palette-sunset.json: ${sunset.error}`)

  // Сценарий 1: метафора → подбор по смыслу → случайные (но воспроизводимые) размеры и состояния.
  // Без ключа LLM это локальный подбор; `variant` — номер варианта, как у «Подобрать заново».
  const byMetaphor = async (text, size, variant = 0) => {
    const { ids } = await resolveMetaphor(text, { variant })
    return planAssembly(ids, { size, variety: true, variant, salt: text })
  }
  // Сценарий 2: названия объектов → лучшее точное совпадение для каждого, все главные.
  const byNames = (text, size) =>
    chooseStates(
      lookupByNames(text).flatMap((lookup) => (lookup.exact && lookup.matches[0] ? [lookup.matches[0].object.id] : [])),
      size,
    ).map((item) => ({ ...item, state: 'main' }))

  const examples = [
    {
      file: 'startup-violet-1000x1000.svg',
      title: 'Сценарий 1: «Успешный стартап», фиолетовая схема, 1000×1000, «собранно»',
      items: await byMetaphor('Успешный стартап', 'L'),
      palette: preset('violet'),
      format: format('square'),
      mode: 'compact',
    },
    {
      file: 'study-mint-1200x630-headline.svg',
      title: 'Сценарий 2: «Книга, наушники, ручка», мятная схема, S, 1200×630, «под заголовок»',
      items: byNames('Книга, наушники, ручка', 'S'),
      palette: preset('mint'),
      format: format('wide'),
      mode: 'headline',
    },
    {
      file: 'finance-sunset-800x1200.svg',
      title:
        'Сценарий 1 + загруженная палитра «Закат»: «Оплата деньгами в мобильном приложении» (вариант 2), ' +
        '800×1200, «со смещением»',
      items: await byMetaphor('Оплата деньгами в мобильном приложении', 'L', 2),
      palette: sunset.palette,
      format: format('tall'),
      mode: 'offset',
    },
  ]

  for (const example of examples) {
    const objects = await assembleScene({
      items: example.items,
      format: example.format,
      mode: example.mode,
      measure: measureItem,
    })
    const svg = await exportSceneSvg({
      format: example.format,
      palette: example.palette,
      objects,
      showDecor: true,
    })
    const comment = `<!-- ${example.title}; объекты: ${objects.map((o) => `${o.objectId}:${o.state}:${o.size}`).join(', ')} -->\n`
    await writeFile(new URL(`../examples/${example.file}`, import.meta.url), comment + svg, 'utf8')
    console.log(`${example.file}: ${objects.length} объектов, ${(svg.length / 1024).toFixed(0)} КБ`)
  }
} finally {
  await server.close()
}
