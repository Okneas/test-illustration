import { createEvent, fireEvent } from '@testing-library/react'

type DragType = 'dragStart' | 'dragOver' | 'dragLeave' | 'drop' | 'dragEnd'

type DragInit = {
  dataTransfer?: object
  clientX?: number
  clientY?: number
}

/**
 * Отправляет drag-событие. В jsdom нет DragEvent: созданное событие получает `dataTransfer`, но
 * теряет координаты, поэтому clientX и clientY дописываются вручную. Возвращает false, если
 * обработчик вызвал preventDefault (то есть drop разрешён).
 */
export function fireDrag(type: DragType, node: Element, { clientX, clientY, ...init }: DragInit = {}): boolean {
  const event = createEvent[type](node, init)
  if (clientX !== undefined) Object.defineProperty(event, 'clientX', { value: clientX })
  if (clientY !== undefined) Object.defineProperty(event, 'clientY', { value: clientY })
  return fireEvent(node, event)
}
