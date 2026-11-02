import { useState } from 'react'
import { Input } from './input'
import { Label } from './label'

type NumberFieldProps = {
  id: string
  label: string
  value: number
  onCommit: (value: number) => void
  step?: number
}

/**
 * Числовое поле с черновиком: пока человек печатает, показывается его текст (можно стереть
 * всё и набрать заново), а в состояние уходят только корректные числа.
 */
export function NumberField({ id, label, value, onCommit, step = 1 }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={draft ?? String(value)}
        onChange={(event) => {
          const text = event.target.value
          setDraft(text)
          const next = Number(text)
          if (text.trim() !== '' && Number.isFinite(next)) onCommit(next)
        }}
        onBlur={() => setDraft(null)}
      />
    </div>
  )
}
