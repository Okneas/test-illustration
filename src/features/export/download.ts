/** Отдаёт текст пользователю как файл (Blob + ссылка download), без растеризации. */
export function downloadText(filename: string, text: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Не сразу: часть браузеров начинает чтение Blob уже после click().
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadSvg(filename: string, svg: string): void {
  downloadText(filename, svg, 'image/svg+xml;charset=utf-8')
}
